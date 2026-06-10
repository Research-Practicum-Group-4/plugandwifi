#!/usr/bin/env bash

# ==============================================================================
# 🚀 PANDOC BATCH CONVERTER (Git Bash / Linux / macOS)
# ==============================================================================
#
# USE CASES
#
# 1. Basic Usage (Default: Current directory, find docx, output markdown, generate in the original location)
#    $ ./pandoc_converter.sh
#
# 2. Specify Path (Parameterization -p / --path)
#    $ ./pandoc_converter.sh -p ./documents
#
# 3. Specify Multiple Input Formats (Parameterization -i / --input)
#    $ ./pandoc_converter.sh -p ./notes -i "[docx, html, ipynb]"
#
# 4. Convert a Single File and Rename it (Parameterization -n / --name)
#    $ ./pandoc_converter.sh -p ./spec.docx -n "api_v2_spec"
# # Result: Generates ./api_v2_spec.md in the original location
#
# 5. Convert an Entire Folder and Output to a New Directory, Preserving the Directory Structure (Parameterization -o) / --out-dir)
#    $ ./pandoc_convertor.sh -p ./old_notes -i "[docx, html]" -o ./ai_ready_notes
# # Result: Recursively creates ./ai_ready_notes and archives the converted files into it, without damaging the original folder.
# 
# 6. Change the output format to plain text (parameterized -t / --to)
#    $ ./pandoc_convertor.sh -p ./docs -t txt
# 
# 使用案例
# 
# 1. 基础用法 (默认：当前目录，找 docx，输出 markdown，在原位置生成)
#    $ ./pandoc_convertor.sh
#
# 2. 指定路径 (参数化 -p / --path)
#    $ ./pandoc_convertor.sh -p ./documents
#
# 3. 指定多种输入格式 (参数化 -i / --input)
#    $ ./pandoc_convertor.sh -p ./notes -i "[docx, html, ipynb]"
#
# 4. 转换单个文件并重命名 (参数化 -n / --name)
#    $ ./pandoc_convertor.sh -p ./spec.docx -n "api_v2_spec"
#    # 结果：在原位置生成 ./api_v2_spec.md
#
# 5. 转换整个文件夹并输出到新目录，保持目录结构 (参数化 -o / --out-dir)
#    $ ./pandoc_convertor.sh -p ./old_notes -i "[docx, html]" -o ./ai_ready_notes
#    # 结果：递归创建 ./ai_ready_notes 并将转换后的文件归档进去，完全不破坏原文件夹
#
# 6. 修改输出格式为纯文本 (参数化 -t / --to)
#    $ ./pandoc_convertor.sh -p ./docs -t txt
#
# ==============================================================================

# 启用 globstar 以支持 ** 递归匹配
shopt -s globstar

# ==================== 默认参数设置 ====================
TARGET="."               # -p, --path
INPUT_RAW="docx"         # -i, --input
OUTPUT_EXT="markdown"    # -t, --to
NEW_FILE_NAME=""         # -n, --name (仅对单文件有效)
NEW_FOLDER_NAME=""       # -o, --out-dir (对文件夹有效)

# ==================== 帮助信息 ====================
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -p, --path <path>         目标文件或文件夹路径 (默认: .)"
    echo "  -i, --input <formats>     输入格式，支持单格式或列表如 \"[docx,html]\" (默认: docx)"
    echo "  -t, --to <format>         输出格式 (默认: markdown)"
    echo "  -n, --name <name>         [单文件专属] 转换后的新文件名 (不需要带后缀)"
    echo "  -o, --out-dir <dir>       [文件夹专属] 导出到新的目标文件夹 (保持原目录结构)"
    echo "  -h, --help                显示此帮助信息"
    exit 0
}

# ==================== 解析命令行参数 (Args Parser) ====================
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--path)     TARGET="$2"; shift 2 ;;
        -i|--input)    INPUT_RAW="$2"; shift 2 ;;
        -t|--to)       OUTPUT_EXT="$2"; shift 2 ;;
        -n|--name)     NEW_FILE_NAME="$2"; shift 2 ;;
        -o|--out-dir)  NEW_FOLDER_NAME="$2"; shift 2 ;;
        -h|--help)     usage ;;
        *) echo "❌ 未知参数: $1"; usage ;;
    esac
done

# 清理输入的格式字符串（去掉括号、逗号，统一换成空格分隔）
INPUT_FORMATS=$(echo "$INPUT_RAW" | tr -d '[]' | tr ',' ' ')

# ==================== 核心转换函数 ====================
# 参数: $1=源文件路径, $2=源文件后缀, $3=当前遍历的根基准路径
convert_file() {
    local src_file="$1"
    local ext="$2"
    local base_target_dir="$3"
    
    local out_file=""

    if [ -f "$TARGET" ] && [ -n "$NEW_FILE_NAME" ]; then
        # 场景 A: 单文件转换且指定了 new_file_name
        local dir_part=$(dirname "$src_file")
        out_file="${dir_part}/${NEW_FILE_NAME}.${OUTPUT_EXT}"
    elif [ -n "$NEW_FOLDER_NAME" ]; then
        # 场景 B: 文件夹转换且指定了镜像输出目录 (保持相对结构)
        # 计算相对路径
        local rel_path="${src_file#$base_target_dir/}"
        local rel_dir=$(dirname "$rel_path")
        local filename=$(basename "$src_file" ".$ext")
        
        # 目标文件夹层级递归创建
        local target_dir="${NEW_FOLDER_NAME}/${rel_dir}"
        mkdir -p "$target_dir"
        
        out_file="${target_dir}/${filename}.${OUTPUT_EXT}"
    else
        # 场景 C: 原地转换
        local base_path="${src_file%.$ext}"
        out_file="${base_path}.${OUTPUT_EXT}"
    fi

    # 执行 Pandoc 核心转换逻辑
    case "$ext" in
        docx|html|ipynb|epub|rst|latex)
            pandoc "$src_file" -f "$ext" -t "$OUTPUT_EXT" --wrap=none -o "$out_file" && echo "  ✅ 已转换 -> $out_file"
            ;;
        doc)
            if command -v catdoc &> /dev/null; then
                catdoc "$src_file" > "${out_file%.*}.txt" && echo "  ✅ 已提取文本 -> ${out_file%.*}.txt (建议转为 docx 获得更好结构)"
            else
                echo "  ⚠️  跳过 $src_file: Pandoc 不支持原生 .doc，请先另存为 .docx。"
            fi
            ;;
        pdf)
            if command -v pdftotext &> /dev/null; then
                pdftotext "$src_file" "${out_file%.*}.txt" && echo "  ✅ 已提取 PDF 文本 -> ${out_file%.*}.txt"
            else
                echo "  ⚠️  跳过 $src_file: Pandoc 无法直接读取 PDF 结构。"
            fi
            ;;
        *)
            pandoc "$src_file" -t "$OUTPUT_EXT" --wrap=none -o "$out_file" 2>/dev/null \
                && echo "  ✅ 已转换 -> $out_file" \
                || echo "  ❌ 失败: 不支持格式 .$ext ($src_file)"
            ;;
    esac
}

# ==================== 主流程控制 ====================

if [ ! -e "$TARGET" ]; then
    echo "❌ 错误: 目标路径 '$TARGET' 不存在！"
    exit 1
fi

echo "🚀 任务启动..."
echo "📂 目标源路径: $TARGET"
echo "🔍 扫描格式:   [ $INPUT_FORMATS ]"
echo "📝 输出格式:   $OUTPUT_EXT"
[ -n "$NEW_FOLDER_NAME" ] && echo "📂 镜像输出至: $NEW_FOLDER_NAME"
echo "------------------------------------------------"

count=0

# 情况 1: 目标是一个独立文件
if [ -f "$TARGET" ]; then
    filename=$(basename "$TARGET")
    actual_ext="${filename##*.}"
    
    if [[ " $INPUT_FORMATS " =~ " $actual_ext " ]]; then
        convert_file "$TARGET" "$actual_ext" "."
        ((count++))
    else
        echo "ℹ️  文件 $TARGET 的格式 (.$actual_ext) 不在本次指定的输入格式中。"
    fi

# 情况 2: 目标是一个文件夹
elif [ -d "$TARGET" ]; then
    # 去除路径末尾的斜杠，保证后续相对路径截取逻辑整洁
    CLEANED_TARGET="${TARGET%/}"

    for ext in $INPUT_FORMATS; do
        echo "🗂️  正在检索 .$ext 格式文件..."
        
        for file in "$CLEANED_TARGET"/**/*."$ext"; do
            [[ -e "$file" ]] || continue
            
            echo "📄 发现文件: $file"
            convert_file "$file" "$ext" "$CLEANED_TARGET"
            ((count++))
        done
    done
fi

echo "------------------------------------------------"
echo "✨ 大功告成！本次共计处理了 $count 个文件。"