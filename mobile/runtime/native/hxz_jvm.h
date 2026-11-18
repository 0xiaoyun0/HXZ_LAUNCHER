#pragma once
#include <string>
#include <vector>
struct HxzJavaJob {
    std::string home, directory, mainClass;
    std::vector<std::string> options, arguments;
};
int hxz_java(const HxzJavaJob& job,bool installerProcess=false);
HxzJavaJob hxz_read_job(const char* path);
