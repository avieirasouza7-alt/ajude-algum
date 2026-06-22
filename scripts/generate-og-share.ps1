$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$targetW = 1200
$targetH = 630
$heroPath = Join-Path $PSScriptRoot '..\src\assets\hero-1.jpg' | Resolve-Path
$outPath = Join-Path $PSScriptRoot '..\public\og-share.jpg' | Resolve-Path

$src = [System.Drawing.Image]::FromFile($heroPath)
$bmp = New-Object System.Drawing.Bitmap $targetW, $targetH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$scale = [Math]::Max($targetW / $src.Width, $targetH / $src.Height)
$nw = [int]($src.Width * $scale)
$nh = [int]($src.Height * $scale)
$ox = [int](($targetW - $nw) / 2)
$oy = [int](($targetH - $nh) / 2)
$g.DrawImage($src, $ox, $oy, $nw, $nh)

$rect = New-Object System.Drawing.Rectangle 0, 0, $targetW, $targetH
$gradL = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rect,
  [System.Drawing.Color]::FromArgb(190, 0, 0, 0),
  [System.Drawing.Color]::FromArgb(85, 0, 0, 0),
  [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal
)
$g.FillRectangle($gradL, 0, 0, $targetW, $targetH)
$gradL.Dispose()

$gradB = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rect,
  [System.Drawing.Color]::FromArgb(165, 0, 0, 0),
  [System.Drawing.Color]::Transparent,
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillRectangle($gradB, 0, [int]($targetH * 0.42), $targetW, [int]($targetH * 0.58))
$gradB.Dispose()

$white = [System.Drawing.Color]::White
$green = [System.Drawing.Color]::FromArgb(255, 4, 120, 87)
$fontBold = New-Object System.Drawing.Font 'Segoe UI', 52, ([System.Drawing.FontStyle]::Bold)
$fontSemi = New-Object System.Drawing.Font 'Segoe UI', 24, ([System.Drawing.FontStyle]::Regular)
$fontBadge = New-Object System.Drawing.Font 'Segoe UI', 14, ([System.Drawing.FontStyle]::Bold)
$fontBrand = New-Object System.Drawing.Font 'Segoe UI', 18, ([System.Drawing.FontStyle]::Bold)
$brushWhite = New-Object System.Drawing.SolidBrush $white
$brushGreen = New-Object System.Drawing.SolidBrush $green

$x = 56
$y = 118

$badgePath = New-Object System.Drawing.Drawing2D.GraphicsPath
$badgePath.AddArc($x, $y, 34, 34, 90, 180)
$badgePath.AddArc($x + 96, $y, 34, 34, 270, 180)
$badgePath.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 255, 255, 255))), $badgePath)
$g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 255, 255, 255)), 1), $badgePath)
$g.DrawString([char]0x2665 + ' UNI' + [char]0x00C3 + 'O', $fontBadge, $brushWhite, ($x + 14), ($y + 7))

$y += 58
$g.DrawString("Juntos podemos`r`ntransformar vidas.", $fontBold, $brushWhite, $x, $y)
$y += 148
$g.DrawString(
  'Pequenas atitudes podem gerar grandes mudan' + [char]0x00E7 + 'as.',
  $fontSemi,
  (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 255, 255, 255))),
  $x,
  $y
)

$ctaY = $y + 54
$ctaPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 12.0
$cx = $x
$cy = $ctaY
$cw = 250
$ch = 48
$ctaPath.AddArc($cx, $cy, $r * 2, $r * 2, 180, 90)
$ctaPath.AddArc($cx + $cw - $r * 2, $cy, $r * 2, $r * 2, 270, 90)
$ctaPath.AddArc($cx + $cw - $r * 2, $cy + $ch - $r * 2, $r * 2, $r * 2, 0, 90)
$ctaPath.AddArc($cx, $cy + $ch - $r * 2, $r * 2, $r * 2, 90, 90)
$ctaPath.CloseFigure()
$g.FillPath($brushGreen, $ctaPath)
$g.DrawString('Criar Campanha', (New-Object System.Drawing.Font 'Segoe UI', 16, ([System.Drawing.FontStyle]::Bold)), $brushWhite, ($x + 22), ($ctaY + 11))

$brand = 'Ajude Algu' + [char]0x00E9 + 'm'
$bs = $g.MeasureString($brand, $fontBrand)
$g.DrawString($brand, $fontBrand, $brushWhite, ($targetW - $bs.Width - 48), ($targetH - 52))

$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
$bmp.Save($outPath, $enc, $ep)

$src.Dispose()
$bmp.Dispose()
$g.Dispose()

Write-Host "Generated $outPath ($targetW x $targetH)"
