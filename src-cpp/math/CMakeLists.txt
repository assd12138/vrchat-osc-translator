# windows使用以下命令调用mingw编译器而不是msvc
# cmake -G "MinGW Makefiles" -B build -S .
# cmake --build .编译
cmake_minimum_required(VERSION 3.10)
project(mathlib)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# msvc导出符号
set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS ON)


# 创建动态库
add_library(mathlib SHARED math.cpp)

# 设置头文件搜索路径
target_include_directories(mathlib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})


set_target_properties(mathlib PROPERTIES
    OUTPUT_NAME mathlib
    PREFIX "lib"
)
