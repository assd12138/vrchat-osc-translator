// add.h
#pragma once

// 1. 定义导出宏 (模仿 OpenVR 风格)
#if defined(_WIN32)
    // Windows: 使用 __declspec(dllexport) 导出符号
    // extern "C" 防止 C++ 名称修饰
    #define MY_LIB_EXPORT extern "C" __declspec(dllexport)
#elif defined(__GNUC__) || defined(__APPLE__)
    // macOS / Linux: 使用 __attribute__((visibility("default"))) 导出符号
    // extern "C" 防止 C++ 名称修饰
    #define MY_LIB_EXPORT extern "C" __attribute__((visibility("default")))
#else
    #error "Unsupported Platform."
#endif

// 2. 声明函数
// 使用上面定义的宏，这样在任何平台上都是可见的 C 符号
MY_LIB_EXPORT int add(int a, int b);

// 如果有更多函数，继续在这里声明
// MY_LIB_EXPORT float multiply(float a, float b);