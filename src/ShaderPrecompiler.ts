type PrecompileCallback = (gl: WebGL2RenderingContext)=>boolean;

// Holds all regisered callbacks used for precompiling WebGL programs
const callbacks: PrecompileCallback[] = [];

/**
 * Registers a callback used to precompile a program. Callbacks are run when the function `compileShaders()` is called
 */
export function registerPrecompileCallback(callback: PrecompileCallback){
    callbacks.push(callback);
}

/**
 * Executes all callbacks which were registered with `registerPrecompileCallback()`
 */
export function compileShaders(gl: WebGL2RenderingContext): Promise<void> {
    return new Promise((resolve, reject) => {
        let i = 0;

        const compileShader = (gl: WebGL2RenderingContext) => {
            if (i >= callbacks.length){
                resolve();
                return;
            }

            const result = callbacks[i](gl);
            
            if (!result){
                reject();
                return;
            }

            i++;
            compileShader(gl);
        }
        compileShader(gl);
    });
}