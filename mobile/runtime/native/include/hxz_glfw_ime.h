#ifndef HXZ_GLFW_IME_H
#define HXZ_GLFW_IME_H

#include "glfw3.h"

// Independent declarations of the public IME ABI used by LWJGL 3.4.1.
// Verified against LWJGL-CI/GLFW commit 03f63972b7238a179123f4cb3fa2c2539d5a6dea,
// include/GLFW/glfw3.h, and the actual LWJGL callback descriptors.
// Keep the stock GLFW 3.4 header and renderer API unchanged.
#ifndef GLFW_IME
#define GLFW_IME 0x00033007
typedef void (*GLFWpreeditfun)(GLFWwindow*, int, unsigned int*, int, int*, int, int);
typedef void (*GLFWimestatusfun)(GLFWwindow*);
typedef void (*GLFWpreeditcandidatefun)(GLFWwindow*, int, int, int, int);
#endif
#ifndef GLFW_MANAGE_PREEDIT_CANDIDATE
#define GLFW_MANAGE_PREEDIT_CANDIDATE 0x00050004
#endif

#ifdef __cplusplus
extern "C" {
#endif
GLFWAPI void glfwGetPreeditCursorRectangle(GLFWwindow*, int*, int*, int*, int*);
GLFWAPI void glfwSetPreeditCursorRectangle(GLFWwindow*, int, int, int, int);
GLFWAPI void glfwResetPreeditText(GLFWwindow*);
GLFWAPI unsigned int* glfwGetPreeditCandidate(GLFWwindow*, int, int*);
GLFWAPI GLFWpreeditfun glfwSetPreeditCallback(GLFWwindow*, GLFWpreeditfun);
GLFWAPI GLFWimestatusfun glfwSetIMEStatusCallback(GLFWwindow*, GLFWimestatusfun);
GLFWAPI GLFWpreeditcandidatefun glfwSetPreeditCandidateCallback(GLFWwindow*, GLFWpreeditcandidatefun);
#ifdef __cplusplus
}
#endif
#endif
