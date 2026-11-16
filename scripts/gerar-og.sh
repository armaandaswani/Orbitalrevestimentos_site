#!/bin/zsh
# Gera as imagens de prévia de link (WhatsApp, Instagram, Google) em JPG de
# 1200 × 630, leves. O WhatsApp muitas vezes não mostra miniatura de imagem WebP
# nem de arquivo pesado (a capa antiga do site tinha 5 MB), então a prévia nunca
# aponta direto para as fotos da página.
#
# Uso (da raiz do repositório): zsh scripts/gerar-og.sh
# Cada linha: origem, destino, deslocamento vertical do recorte em px depois de
# ajustar a largura em 1200 (vazio = recorte centrado).
set -e
cd "${0:A:h}/.." || exit 1
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

gerar() {
  local origem="$1" destino="$2" topo="$3"
  mkdir -p "${destino:h}"
  # 1. Largura 1200, mantendo a proporção (as três fontes são mais altas que 1200 × 630 depois disso).
  sips -s format png --resampleWidth 1200 "$origem" --out "$tmp/largo.png" >/dev/null
  local alto=$(sips -g pixelHeight "$tmp/largo.png" | awk '/pixelHeight/{print $2}')
  if (( alto < 630 )); then
    # Fonte larga demais: ajusta pela altura e recorta a largura.
    sips -s format png --resampleHeight 630 "$origem" --out "$tmp/largo.png" >/dev/null
    sips --cropToHeightWidth 630 1200 "$tmp/largo.png" --out "$tmp/recorte.png" >/dev/null
  elif [[ -n "$topo" ]]; then
    sips --cropToHeightWidth 630 1200 --cropOffset "$topo" 0 "$tmp/largo.png" --out "$tmp/recorte.png" >/dev/null
  else
    sips --cropToHeightWidth 630 1200 "$tmp/largo.png" --out "$tmp/recorte.png" >/dev/null
  fi
  # 2. JPG em qualidade 80: fica bem abaixo dos ~300 KB que o WhatsApp aceita.
  sips -s format jpeg -s formatOptions 80 "$tmp/recorte.png" --out "$destino" >/dev/null
  printf "%-44s %4d × %d  %3d KB\n" "$destino" \
    $(sips -g pixelWidth "$destino" | awk '/pixelWidth/{print $2}') \
    $(sips -g pixelHeight "$destino" | awk '/pixelHeight/{print $2}') \
    $(( $(stat -f%z "$destino") / 1024 ))
}

gerar public/images/catalogue/hero-cover.png        src/app/opengraph-image.jpg                ""
gerar public/images/techstone/cenas/curva-v3-desktop.webp public/images/og/techstone.jpg      ""
gerar public/images/pfb-carbon/miolo-estudio-v1.webp public/images/og/pfb-carbon.jpg           ""
