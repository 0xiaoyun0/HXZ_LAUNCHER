package up.hxz;

import java.io.IOException;

/** Marks a recoverable download failure without changing existing installation files. */
public class NetworkFailure extends IOException {
    public NetworkFailure(String message) { super(message); }
    public NetworkFailure(String message, Throwable cause) { super(message, cause); }
}
