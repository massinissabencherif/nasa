#!/bin/zsh
# usage: sheet.sh <dir> <out.png> [cols]
cols=${3:-4}
ffmpeg -loglevel error -y -pattern_type glob -i "$1/k-*.png" -vf "scale=640:-1,drawtext=fontfile=/System/Library/Fonts/Menlo.ttc:text='%{metadata\:lavf.image2dec.source_basename}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x4:padding=4" -frames:v 1 "$2"
