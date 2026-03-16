cmake_minimum_required(VERSION 3.10)
project(mathlib)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 创建动态库
add_library(mathlib SHARED math.cpp)

# 设置头文件搜索路径
target_include_directories(mathlib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# 设置输出名称为 libmathlib.so (Linux) 或 libmathlib.dylib (macOS)
set_target_properties(mathlib PROPERTIES
    OUTPUT_NAME mathlib
    PREFIX "lib"
)
