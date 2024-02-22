type PrecompileCallback = (gl: WebGL2RenderingContext)=>boolean;

const callbacks: PrecompileCallback[] = [];

export function registerPrecompileCallback(callback: PrecompileCallback){
    callbacks.push(callback);
}

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