import org.lwjgl.glfw.*;
import org.lwjgl.system.*;
import java.util.*;

// Real LWJGL 3.4.1 JNI calls into the host build of the production adapter.
// The fixture supplies a window without creating an Android surface or renderer.
public final class GlfwImeInterop084 {
    static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    static void error(int expected){check(GLFW.glfwGetError(null)==expected,"GLFW error "+expected);}
    static void hook(String name){long address=GLFW.getLibrary().getFunctionAddress(name);check(address!=0,name);JNI.invokeV(address);}
    public static void main(String[] args){
        Configuration.GLFW_LIBRARY_NAME.set(args[0]);
        check(Checks.CHECKS,"Checks must stay enabled");
        check(GLFW.glfwInit(),"init");
        long window=JNI.invokeP(GLFW.getLibrary().getFunctionAddress("hxz_test_create_window"));
        check(window!=0,"valid window");
        if(args.length>1){
            check(GLFW.Functions.SetPreeditCallback==0,"legacy symbol is absent");
            try{GLFW.nglfwSetPreeditCallback(window,0);throw new AssertionError("Expected exact reported NPE");}
            catch(NullPointerException expected){
                check(expected.getStackTrace()[0].getClassName().equals("org.lwjgl.system.Checks"),"Checks failure");
                check(expected.getStackTrace()[1].getMethodName().equals("nglfwSetPreeditCallback"),"reported call site");
                System.out.println("RED reproduced: Checks.check -> GLFW.nglfwSetPreeditCallback, valid window, NULL function");
            }
            GLFW.glfwDestroyWindow(window);GLFW.glfwTerminate();return;
        }
        int[] statusChanges={0},preedits={0},candidates={0};
        List<Integer> committed=new ArrayList<>();
        try(GLFWKeyCallback key=GLFWKeyCallback.create((w,k,s,a,m)->{});
            GLFWCharCallback chars=GLFWCharCallback.create((w,c)->{check(w==window,"char window");committed.add(c);});
            GLFWPreeditCallback preedit=GLFWPreeditCallback.create((w,count,text,blockCount,blocks,focused,caret)->{
                check(w==window,"preedit window");preedits[0]++;
                if(count==0){check(blockCount==0&&focused==0&&caret==0,"clear preedit");return;}
                check(count==2&&blockCount==1&&focused==0&&caret==2,"preedit callback ABI scalars");
                check(MemoryUtil.memGetInt(text)==0x4e2d&&MemoryUtil.memGetInt(text+4)==0x1f600,"UTF-32 ABI payload");
                check(MemoryUtil.memGetInt(blocks)==2,"preedit block ABI");
            });
            GLFWIMEStatusCallback ime=GLFWIMEStatusCallback.create(w->{check(w==window,"IME window");statusChanges[0]++;GLFW.glfwGetInputMode(w,GLFW.GLFW_IME);});
            GLFWPreeditCandidateCallback candidate=GLFWPreeditCandidateCallback.create((w,count,selected,start,size)->{
                check(w==window&&count==7&&selected==3&&start==2&&size==4,"candidate callback ABI");candidates[0]++;
            })){
            // The order is the actual InputConstants.setupKeyboardCallbacks order.
            GLFW.glfwSetKeyCallback(window,key);GLFW.glfwSetCharCallback(window,chars);
            check(GLFW.glfwSetPreeditCallback(window,preedit)==null,"initial preedit callback");
            check(GLFW.glfwSetIMEStatusCallback(window,ime)==null,"initial IME callback");
            check(GLFW.glfwSetPreeditCandidateCallback(window,candidate)==null,"initial candidates callback");
            check(GLFW.nglfwSetPreeditCallback(window,0)==preedit.address(),"return old preedit");
            check(GLFW.nglfwSetPreeditCallback(window,preedit.address())==0,"restore preedit");
            check(GLFW.nglfwSetIMEStatusCallback(window,0)==ime.address(),"return old IME");
            check(GLFW.nglfwSetIMEStatusCallback(window,ime.address())==0,"restore IME");
            check(GLFW.nglfwSetPreeditCandidateCallback(window,0)==candidate.address(),"return old candidate");
            check(GLFW.nglfwSetPreeditCandidateCallback(window,candidate.address())==0,"restore candidate");
            check(GLFW.glfwGetInputMode(window,GLFW.GLFW_IME)==GLFW.GLFW_FALSE,"initial IME request");
            GLFW.glfwSetInputMode(window,GLFW.GLFW_IME,GLFW.GLFW_TRUE);
            check(GLFW.glfwGetInputMode(window,GLFW.GLFW_IME)==GLFW.GLFW_TRUE,"enable IME");
            GLFW.glfwSetInputMode(window,GLFW.GLFW_IME,GLFW.GLFW_TRUE);check(statusChanges[0]==1,"notify only changes");
            GLFW.glfwSetInputMode(window,GLFW.GLFW_IME,GLFW.GLFW_FALSE);check(statusChanges[0]==2,"disable IME");
            int[] x={99},y={99},width={99},height={99};
            GLFW.glfwSetPreeditCursorRectangle(window,-12,34,5,6);
            GLFW.glfwGetPreeditCursorRectangle(window,x,y,width,height);
            check(x[0]==-12&&y[0]==34&&width[0]==5&&height[0]==6,"rectangle roundtrip");
            GLFW.glfwGetPreeditCursorRectangle(window,(int[])null,null,null,null);
            GLFW.glfwSetPreeditCursorRectangle(window,0,0,-1,6);error(GLFW.GLFW_INVALID_VALUE);
            GLFW.glfwGetPreeditCursorRectangle(window,x,y,width,height);check(x[0]==-12&&width[0]==5,"invalid rectangle preserves state");
            check(GLFW.glfwGetPreeditCandidate(window,0)==null,"Android owns candidate text");
            hook("hxz_test_callback_payloads");check(preedits[0]==1&&candidates[0]==1,"ABI callbacks delivered");
            hook("hxz_test_commit");GLFW.glfwResetPreeditText(window);GLFW.glfwPollEvents();
            check(preedits[0]==2,"reset clears client preedit");
            check(committed.equals(Arrays.asList(65,0x4e2d,0x1f600)),"queued ASCII/CJK/supplementary commits survive disabled IME and reset");
            error(GLFW.GLFW_NO_ERROR);hook("hxz_test_null_window");
            GLFW.glfwInitHint(GLFW.GLFW_MANAGE_PREEDIT_CANDIDATE,GLFW.GLFW_FALSE);error(GLFW.GLFW_NO_ERROR);
            GLFW.glfwInitHint(GLFW.GLFW_MANAGE_PREEDIT_CANDIDATE,GLFW.GLFW_TRUE);error(GLFW.GLFW_FEATURE_UNAVAILABLE);
            GLFW.glfwDestroyWindow(window);
            check(GLFW.nglfwSetPreeditCallback(window,0)==0,"destroyed preedit window");error(GLFW.GLFW_INVALID_VALUE);
            check(GLFW.nglfwSetIMEStatusCallback(window,0)==0,"destroyed IME window");error(GLFW.GLFW_INVALID_VALUE);
            check(GLFW.nglfwSetPreeditCandidateCallback(window,0)==0,"destroyed candidate window");error(GLFW.GLFW_INVALID_VALUE);
            GLFW.glfwGetPreeditCursorRectangle(window,x,y,width,height);check(x[0]==0&&y[0]==0&&width[0]==0&&height[0]==0,"destroyed output initialization");error(GLFW.GLFW_INVALID_VALUE);
            GLFW.glfwSetPreeditCursorRectangle(window,0,0,1,1);error(GLFW.GLFW_INVALID_VALUE);
            GLFW.glfwResetPreeditText(window);error(GLFW.GLFW_INVALID_VALUE);
            check(GLFW.glfwGetPreeditCandidate(window,0)==null,"destroyed candidate");error(GLFW.GLFW_INVALID_VALUE);
            GLFW.glfwSetInputMode(window,GLFW.GLFW_IME,GLFW.GLFW_TRUE);error(GLFW.GLFW_INVALID_VALUE);
            check(GLFW.glfwGetInputMode(window,GLFW.GLFW_IME)==0,"destroyed IME state");error(GLFW.GLFW_INVALID_VALUE);
        }
        long second=JNI.invokeP(GLFW.getLibrary().getFunctionAddress("hxz_test_create_window"));
        try(GLFWIMEStatusCallback destroy=GLFWIMEStatusCallback.create(GLFW::glfwDestroyWindow)){
            GLFW.glfwSetIMEStatusCallback(second,destroy);GLFW.glfwSetInputMode(second,GLFW.GLFW_IME,GLFW.GLFW_TRUE);
            error(GLFW.GLFW_NO_ERROR); // Callback can destroy the window without post-callback dereference.
        }
        GLFW.glfwTerminate();
        check(GLFW.nglfwSetPreeditCallback(window,0)==0,"uninitialized callback");error(GLFW.GLFW_NOT_INITIALIZED);
        System.out.println("GREEN: real LWJGL JNI registration, callback ABI, lifecycle, rectangle, IME modes and committed Unicode passed");
    }
}
