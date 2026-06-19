Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$OutDir = Join-Path (Get-Location) "assets\design-examples"
if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

function New-Canvas($path, $title, $subtitle) {
  $bitmap = New-Object System.Drawing.Bitmap 1600, 1000
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(248, 250, 252))

  $headerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 35, 48))
  $graphics.FillRectangle($headerBrush, 0, 0, 1600, 106)
  $titleFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(205, 213, 224))
  $graphics.DrawString($title, $titleFont, $white, 40, 22)
  $graphics.DrawString($subtitle, $subFont, $muted, 43, 69)

  return @{
    Bitmap = $bitmap
    Graphics = $graphics
    Path = $path
  }
}

function Save-Canvas($canvas) {
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($canvas.Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Brush($r, $g, $b) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($r, $g, $b))
}

function PenC($r, $g, $b, $w = 2) {
  return New-Object System.Drawing.Pen(([System.Drawing.Color]::FromArgb($r, $g, $b)), $w)
}

function Draw-Text($g, $text, $x, $y, $size = 18, $color = $null, $bold = $false) {
  if ($null -eq $color) { $color = Brush 30 41 59 }
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = New-Object System.Drawing.Font("Segoe UI", $size, $style)
  $g.DrawString($text, $font, $color, $x, $y)
  $font.Dispose()
}

function Draw-TextWrapped($g, $text, $x, $y, $w, $h, $size = 15, $color = $null, $bold = $false) {
  if ($null -eq $color) { $color = Brush 51 65 85 }
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = New-Object System.Drawing.Font("Segoe UI", $size, $style)
  $format = New-Object System.Drawing.StringFormat
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $format.FormatFlags = 0
  $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
  $g.DrawString($text, $font, $color, $rect, $format)
  $format.Dispose()
  $font.Dispose()
}

function Draw-Callout($g, $text, $x, $y, $w, $h) {
  $brush = Brush 255 255 255
  $border = PenC 148 163 184 2
  $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
  $g.FillRectangle($brush, $rect)
  $g.DrawRectangle($border, $x, $y, $w, $h)
  Draw-TextWrapped $g $text ($x + 16) ($y + 12) ($w - 32) ($h - 20) 14 (Brush 51 65 85) $false
}

function Draw-RoundedTag($g, $text, $x, $y, $w, $h, $r, $gb, $b) {
  $brush = Brush $r $gb $b
  $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
  $g.FillRectangle($brush, $rect)
  Draw-Text $g $text ($x + 12) ($y + 8) 14 (Brush 255 255 255) $true
}

function Draw-Road($g, $x, $y, $w, $h, $orientation) {
  $road = Brush 30 41 59
  $g.FillRectangle($road, $x, $y, $w, $h)
  $linePen = PenC 245 158 11 6
  if ($orientation -eq "h") {
    $g.DrawLine($linePen, $x + 20, $y + $h / 2 - 8, $x + $w - 20, $y + $h / 2 - 8)
    $g.DrawLine($linePen, $x + 20, $y + $h / 2 + 8, $x + $w - 20, $y + $h / 2 + 8)
  } else {
    $g.DrawLine($linePen, $x + $w / 2 - 8, $y + 20, $x + $w / 2 - 8, $y + $h - 20)
    $g.DrawLine($linePen, $x + $w / 2 + 8, $y + 20, $x + $w / 2 + 8, $y + $h - 20)
  }
}

function Draw-Sidewalk($g, $x, $y, $w, $h) {
  $g.FillRectangle((Brush 226 232 240), $x, $y, $w, $h)
  $pen = PenC 203 213 225 1
  for ($gx = $x; $gx -le $x + $w; $gx += 40) { $g.DrawLine($pen, $gx, $y, $gx, $y + $h) }
  for ($gy = $y; $gy -le $y + $h; $gy += 40) { $g.DrawLine($pen, $x, $gy, $x + $w, $gy) }
}

function Draw-Crosswalk($g, $x, $y, $w, $h, $orientation) {
  $white = Brush 248 250 252
  if ($orientation -eq "h") {
    for ($i = 0; $i -lt 8; $i++) { $g.FillRectangle($white, $x + $i * 24, $y, 12, $h) }
  } else {
    for ($i = 0; $i -lt 8; $i++) { $g.FillRectangle($white, $x, $y + $i * 24, $w, 12) }
  }
}

function Draw-Building($g, $x, $y, $w, $h, $name, $bodyBrush, $accentBrush) {
  $shadow = Brush 203 213 225
  $g.FillRectangle($shadow, $x + 8, $y + 8, $w, $h)
  $g.FillRectangle($bodyBrush, $x, $y, $w, $h)
  $g.FillRectangle($accentBrush, $x, $y, $w, 34)
  $g.FillRectangle((Brush 15 118 160), $x + 22, $y + 58, 54, 42)
  $g.FillRectangle((Brush 15 118 160), $x + $w - 78, $y + 58, 54, 42)
  $g.FillRectangle((Brush 72 44 28), $x + $w / 2 - 24, $y + $h - 56, 48, 56)
  Draw-Text $g $name ($x + 14) ($y + 8) 14 (Brush 255 255 255) $true
}

function Draw-Planter($g, $x, $y, $w, $h) {
  $g.FillRectangle((Brush 120 72 35), $x, $y, $w, $h)
  $g.FillRectangle((Brush 78 47 26), $x + 6, $y + 6, $w - 12, $h - 12)
  $leaf = Brush 34 197 94
  for ($i = 0; $i -lt [Math]::Max(3, [int]($w / 28)); $i++) {
    $px = $x + 10 + ($i * 25) % ($w - 20)
    $py = $y - 12 + (($i % 2) * 8)
    $g.FillRectangle($leaf, $px, $py, 22, 22)
    $flowerBrush = if ($i % 3 -eq 0) { Brush 239 68 68 } elseif ($i % 3 -eq 1) { Brush 250 204 21 } else { Brush 255 255 255 }
    $g.FillEllipse($flowerBrush, $px + 7, $py - 7, 10, 10)
  }
}

function Draw-TableSet($g, $x, $y, $scale = 1.0, $umbrella = $true) {
  $wood = Brush 146 92 45
  $darkWood = Brush 92 56 30
  $size = [int](54 * $scale)
  $g.FillRectangle($darkWood, $x - 34 * $scale, $y - 10 * $scale, 24 * $scale, 42 * $scale)
  $g.FillRectangle($darkWood, $x + 64 * $scale, $y - 10 * $scale, 24 * $scale, 42 * $scale)
  $g.FillRectangle($wood, $x, $y, $size, $size)
  $g.FillRectangle((Brush 245 245 245), $x + 14 * $scale, $y + 12 * $scale, 16 * $scale, 12 * $scale)
  $g.FillRectangle((Brush 220 38 38), $x + 34 * $scale, $y + 10 * $scale, 8 * $scale, 20 * $scale)
  if ($umbrella) {
    $g.FillRectangle((Brush 100 65 32), $x + $size / 2 - 4, $y - 70 * $scale, 8, 82 * $scale)
    $g.FillPie((Brush 220 38 38), $x - 28 * $scale, $y - 110 * $scale, 112 * $scale, 80 * $scale, 180, 60)
    $g.FillPie((Brush 255 255 255), $x - 28 * $scale, $y - 110 * $scale, 112 * $scale, 80 * $scale, 240, 60)
    $g.FillPie((Brush 220 38 38), $x - 28 * $scale, $y - 110 * $scale, 112 * $scale, 80 * $scale, 300, 60)
  }
}

function Draw-NPC($g, $x, $y, $shirtR, $shirtG, $shirtB) {
  $g.FillRectangle((Brush 79 46 31), $x + 10, $y, 18, 18)
  $g.FillRectangle((Brush 249 191 134), $x + 8, $y + 18, 24, 24)
  $g.FillRectangle((Brush $shirtR $shirtG $shirtB), $x + 5, $y + 42, 30, 44)
  $g.FillRectangle((Brush 15 23 42), $x + 8, $y + 86, 10, 34)
  $g.FillRectangle((Brush 15 23 42), $x + 22, $y + 86, 10, 34)
}

function Draw-Car($g, $x, $y, $w, $h, $r, $gb, $b) {
  $g.FillRectangle((Brush $r $gb $b), $x, $y + 18, $w, $h - 18)
  $g.FillRectangle((Brush $r $gb $b), $x + 26, $y, $w - 52, 32)
  $g.FillRectangle((Brush 15 23 42), $x + 44, $y + 8, $w - 88, 22)
  $g.FillEllipse((Brush 15 23 42), $x + 20, $y + $h - 10, 28, 28)
  $g.FillEllipse((Brush 15 23 42), $x + $w - 48, $y + $h - 10, 28, 28)
}

function Draw-Arrow($g, $x1, $y1, $x2, $y2, $r, $gb, $b) {
  $pen = PenC $r $gb $b 5
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
}

function New-MapLayoutImage {
  $path = Join-Path $OutDir "v1-mini-map-layout-v1.png"
  $c = New-Canvas $path "V1 Small Map Layout" "Compact test block: player house spawn, open restaurant, phone shop/taxi, pocket park"
  $g = $c.Graphics

  Draw-Sidewalk $g 110 180 1380 700
  Draw-Road $g 110 460 1380 130 "h"
  Draw-Road $g 730 180 130 700 "v"
  Draw-Crosswalk $g 682 460 230 130 "h"
  Draw-Crosswalk $g 730 410 130 220 "v"

  Draw-Building $g 180 640 250 170 "PLAYER HOUSE" (Brush 247 181 103) (Brush 79 70 229)
  Draw-Building $g 940 210 360 210 "OPEN RESTAURANT" (Brush 251 191 36) (Brush 185 28 28)
  Draw-Building $g 980 650 260 160 "PHONE SHOP" (Brush 125 211 252) (Brush 37 99 235)
  Draw-Building $g 240 230 280 180 "POCKET PARK EDGE" (Brush 187 247 208) (Brush 22 101 52)

  Draw-Planter $g 945 445 135 45
  Draw-Planter $g 1135 445 135 45
  Draw-TableSet $g 1050 390 0.75 $true
  Draw-TableSet $g 1220 392 0.75 $true
  Draw-Car $g 570 485 130 58 239 68 68
  Draw-Car $g 910 500 138 60 234 179 8
  Draw-Car $g 1280 500 130 60 34 197 94

  Draw-RoundedTag $g "SPAWN" 260 830 92 40 37 99 235
  Draw-RoundedTag $g "CORE 1" 990 175 90 38 185 28 28
  Draw-RoundedTag $g "CORE 2" 1010 820 90 38 37 99 235
  Draw-RoundedTag $g "CORE 3" 275 185 90 38 22 101 52
  Draw-RoundedTag $g "CORE 4" 1180 585 90 38 217 119 6

  Draw-Text $g "V1 loop: home -> park -> crosswalk -> restaurant -> phone/taxi -> home" 115 916 22 (Brush 15 23 42) $true
  Draw-Arrow $g 355 720 670 535 59 130 246
  Draw-Arrow $g 825 535 1035 405 220 38 38
  Draw-Arrow $g 1170 510 1110 655 217 119 6
  Draw-Arrow $g 980 750 430 730 59 130 246

  Draw-Callout $g "V1 stays small: four core locations, one loop, short walks, readable mini-map icons." 1050 835 440 72
  Save-Canvas $c
}

function New-HouseSpawnImage {
  $path = Join-Path $OutDir "v1-player-house-spawn-v1.png"
  $c = New-Canvas $path "Core Location 1: Player House Spawn" "Spawn outside the player's house, then walk naturally into the small city block"
  $g = $c.Graphics

  Draw-Sidewalk $g 80 690 1440 150
  Draw-Road $g 80 835 1440 90 "h"
  $g.FillRectangle((Brush 167 243 208), 80, 170, 1440, 520)

  Draw-Building $g 410 260 470 330 "PLAYER HOUSE" (Brush 251 191 36) (Brush 59 130 246)
  $g.FillRectangle((Brush 100 116 139), 570, 590, 150, 100)
  $g.FillRectangle((Brush 226 232 240), 610, 590, 70, 250)
  $g.FillRectangle((Brush 120 72 35), 330, 540, 90, 150)
  Draw-Text $g "mailbox" 290 505 16 (Brush 51 65 85) $false
  Draw-Planter $g 385 590 150 45
  Draw-Planter $g 750 590 150 45
  Draw-Car $g 980 585 210 90 34 197 94

  Draw-RoundedTag $g "SPAWN POINT" 605 735 150 42 37 99 235
  Draw-NPC $g 610 610 37 99 235
  Draw-Arrow $g 680 755 680 835 37 99 235
  Draw-Arrow $g 735 710 1045 665 217 119 6

  Draw-Callout $g "Player starts at the front path. V1 gets a home base before the first short walk into town." 970 220 450 90
  Draw-Callout $g "Objects: porch, mailbox, driveway, front path, door, visible windows, spawn marker, optional parked car." 970 330 450 110
  Draw-Callout $g "First route: house path -> sidewalk -> pocket park -> restaurant street. No huge empty yard." 970 465 450 90
  Draw-Text $g "Test capability: spawn, orientation, house identity, short route into main block" 105 930 22 (Brush 15 23 42) $true

  Save-Canvas $c
}

function New-RestaurantImage {
  $path = Join-Path $OutDir "v1-open-restaurant-location-v1.png"
  $c = New-Canvas $path "Core Location 2: Open Restaurant" "Make the existing restaurant enterable with an interior, patio, chunky umbrellas, and moving NPC paths"
  $g = $c.Graphics

  Draw-Sidewalk $g 70 630 1460 270
  $g.FillRectangle((Brush 251 191 36), 210, 165, 880, 465)
  $g.FillRectangle((Brush 185 28 28), 210, 165, 880, 58)
  $g.FillRectangle((Brush 125 211 252), 290, 300, 170, 150)
  $g.FillRectangle((Brush 125 211 252), 850, 300, 170, 150)
  $g.FillRectangle((Brush 72 44 28), 600, 405, 150, 225)
  $g.FillRectangle((Brush 254 240 138), 490, 235, 320, 45)
  $g.FillRectangle((Brush 220 38 38), 270, 455, 760, 45)
  for ($i = 0; $i -lt 12; $i++) {
    $stripe = if ($i % 2 -eq 0) { Brush 220 38 38 } else { Brush 255 255 255 }
    $g.FillRectangle($stripe, 285 + $i * 60, 500, 60, 95)
  }

  Draw-Planter $g 260 660 230 54
  Draw-Planter $g 800 660 230 54
  Draw-TableSet $g 265 770 1.15 $true
  Draw-TableSet $g 520 775 1.15 $true
  Draw-TableSet $g 790 775 1.15 $true
  Draw-NPC $g 340 785 220 38 38
  Draw-NPC $g 655 790 34 197 94
  Draw-NPC $g 670 455 245 158 11

  $g.FillRectangle((Brush 236 253 245), 1140, 190, 360, 380)
  $g.DrawRectangle((PenC 15 23 42 3), 1140, 190, 360, 380)
  Draw-Text $g "INTERIOR PLAN" 1160 210 22 (Brush 15 23 42) $true
  $g.FillRectangle((Brush 146 92 45), 1175, 270, 260, 55)
  Draw-Text $g "counter + register" 1195 283 15 (Brush 255 255 255) $true
  $g.FillRectangle((Brush 251 191 36), 1180, 350, 100, 70)
  $g.FillRectangle((Brush 251 191 36), 1320, 350, 100, 70)
  $g.FillRectangle((Brush 59 130 246), 1180, 455, 240, 42)
  Draw-Text $g "booth seating" 1200 462 15 (Brush 255 255 255) $true
  Draw-Arrow $g 1245 520 1070 625 220 38 38

  Draw-Callout $g "Required upgrade: actual open restaurant, not a fake front. Player enters through the door." 70 130 470 75
  Draw-Callout $g "NPC loops: enter, queue, order, sit inside, sit outside, stand up, leave." 70 225 470 75
  Draw-Callout $g "Umbrellas need poles, thick canopies, table scale, and clear red-white sections." 70 320 470 75
  Draw-Text $g "Test capability: enterable building, interior props, queue, seating, patio, NPC movement" 105 930 22 (Brush 15 23 42) $true

  Save-Canvas $c
}

function New-PhoneTaxiImage {
  $path = Join-Path $OutDir "v1-phone-shop-taxi-v1.png"
  $c = New-Canvas $path "Core Location 3: Phone Shop + Taxi Curb" "Small utility location for phone UI, pickup, and short NPC errand loops"
  $g = $c.Graphics

  Draw-Sidewalk $g 80 560 1440 240
  Draw-Road $g 80 800 1440 110 "h"
  Draw-Building $g 220 230 450 330 "PHONE SHOP" (Brush 125 211 252) (Brush 37 99 235)
  $g.FillRectangle((Brush 14 165 233), 270, 340, 125, 95)
  $g.FillRectangle((Brush 14 165 233), 490, 340, 125, 95)
  $g.FillRectangle((Brush 255 255 255), 330, 480, 210, 58)
  Draw-Text $g "phones + chargers" 350 495 14 (Brush 15 23 42) $true
  Draw-NPC $g 465 470 37 99 235
  Draw-NPC $g 315 620 245 158 11

  Draw-Car $g 870 705 320 130 234 179 8
  Draw-RoundedTag $g "TAXI PICKUP" 960 610 160 42 217 119 6
  $g.FillRectangle((Brush 15 23 42), 1210, 605, 12, 150)
  $g.FillRectangle((Brush 254 240 138), 1180, 585, 80, 45)
  Draw-Text $g "WAIT" 1197 596 16 (Brush 15 23 42) $true
  Draw-NPC $g 1280 620 220 38 38
  Draw-Arrow $g 650 640 875 755 37 99 235
  Draw-Arrow $g 1295 730 1195 745 217 119 6

  Draw-Callout $g "Phone shop should be enterable or partially enterable: door, counter, shelves, phone display objects." 760 220 560 80
  Draw-Callout $g "Taxi curb tests pickup/fast travel later: parked taxi, sign, waiting NPC, interaction marker." 760 325 560 80
  Draw-Callout $g "Keep this smaller than the restaurant. It is a utility stop, not the hero location." 760 430 560 80
  Draw-Text $g "Test capability: shop interaction, phone affordance, taxi pickup, NPC waiting and entering/leaving" 105 930 22 (Brush 15 23 42) $true

  Save-Canvas $c
}

function New-PocketParkImage {
  $path = Join-Path $OutDir "v1-pocket-park-plaza-v1.png"
  $c = New-Canvas $path "Core Location 4: Pocket Park / Sidewalk Plaza" "A tiny breathing space between home and restaurant, not a huge park"
  $g = $c.Graphics

  $g.FillRectangle((Brush 187 247 208), 80, 150, 1440, 710)
  Draw-Sidewalk $g 80 420 1440 155
  Draw-Sidewalk $g 690 150 155 710
  Draw-Crosswalk $g 690 420 155 155 "v"
  Draw-Planter $g 250 310 280 58
  Draw-Planter $g 1020 620 280 58
  $g.FillRectangle((Brush 120 72 35), 355, 565, 280, 50)
  Draw-Text $g "bench" 445 572 18 (Brush 255 255 255) $true
  $g.FillRectangle((Brush 120 72 35), 960, 350, 280, 50)
  Draw-Text $g "bench" 1050 357 18 (Brush 255 255 255) $true

  for ($i = 0; $i -lt 3; $i++) {
    $tx = 300 + $i * 420
    $g.FillRectangle((Brush 92 56 30), $tx, 190, 46, 140)
    $g.FillRectangle((Brush 22 163 74), $tx - 62, 135, 170, 95)
    $g.FillRectangle((Brush 34 197 94), $tx - 25, 105, 140, 95)
  }

  $g.FillRectangle((Brush 15 23 42), 745, 270, 14, 135)
  $g.FillRectangle((Brush 254 240 138), 715, 230, 75, 48)
  Draw-NPC $g 500 610 37 99 235
  Draw-NPC $g 1090 405 245 158 11
  Draw-Arrow $g 760 575 760 420 34 197 94
  Draw-Arrow $g 640 500 410 500 34 197 94
  Draw-Arrow $g 850 500 1120 500 34 197 94

  Draw-Callout $g "Purpose: compact route break." 90 865 450 60
  Draw-Callout $g "Objects: benches, trees, planters, idle NPCs." 575 865 450 60
  Draw-Callout $g "Keep compact, not a huge park." 1060 865 450 60
  Draw-Text $g "Test capability: route readability, idle NPCs, compact landmark, mini-map icon" 105 935 22 (Brush 15 23 42) $true

  Save-Canvas $c
}

New-MapLayoutImage
New-HouseSpawnImage
New-RestaurantImage
New-PhoneTaxiImage
New-PocketParkImage

Get-ChildItem -LiteralPath $OutDir -Filter "v1-*-v1.png" |
  Select-Object Name, Length, FullName
