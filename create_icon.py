#!/usr/bin/env python3
"""
Windows用のアイコンファイル(.ico)を生成するスクリプト
original.pngからicon.icoを生成します
"""

from PIL import Image
import os

def create_windows_icon():
    """original.pngからWindows用のicon.icoを生成"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    
    input_path = os.path.join(icons_dir, 'original.png')
    output_path = os.path.join(icons_dir, 'icon.ico')
    
    if not os.path.exists(input_path):
        print(f"エラー: {input_path} が見つかりません")
        return
    
    print(f"入力: {input_path}")
    print(f"出力: {output_path}")
    
    # 画像を開く
    img = Image.open(input_path)
    
    # RGBAモードに変換
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # 複数のサイズでアイコンを生成（Windows用）
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    
    # 各サイズにリサイズした画像リストを作成
    icons = []
    for size in icon_sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        icons.append(resized)
    
    # .icoファイルとして保存
    img.save(output_path, format='ICO', sizes=icon_sizes)
    
    print(f"✅ Windows用アイコン生成完了: {output_path}")
    print(f"   サイズ: {icon_sizes}")

if __name__ == '__main__':
    create_windows_icon()
