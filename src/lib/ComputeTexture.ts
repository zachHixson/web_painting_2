export class Compute_Texture {
    private _gl: WebGL2RenderingContext;
    private _tex: WebGLTexture;
    private _frameBuffer: WebGLFramebuffer;
    private _width: number;

    constructor(gl: WebGL2RenderingContext, width: number, internalFormat: GLint, baseFormat: GLint, type: GLint) {
        this._gl = gl;
        this._tex = this._gl.createTexture();
        this._frameBuffer = this._gl.createFramebuffer();
        this._width = width;

        this._gl.bindTexture(this._gl.TEXTURE_2D, this._tex);
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._frameBuffer);
        this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, this._tex, 0);

        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._gl.NEAREST);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);

        this._gl.texImage2D(
            this._gl.TEXTURE_2D,
            0,
            internalFormat,
            this._width,
            this._width,
            0,
            baseFormat,
            type,
            null
        );

        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    }

    get texture() { return this._tex }
    get width() { return this._width }

    setAsRenderTarget(): void {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._frameBuffer);
    }

    unsetRenderTarget(): void {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    }

    destroy(): void {
        this._gl.deleteTexture(this._tex);
    }
}

export class Compute_Texture_Swap {
    private _gl: WebGL2RenderingContext;
    private _tex1: Compute_Texture;
    private _tex2: Compute_Texture;
    private _rTex: Compute_Texture;
    private _wTex: Compute_Texture;

    constructor(gl: WebGL2RenderingContext, width: number, internalFormat: GLint, baseFormat: GLint, type: GLint) {
        this._gl = gl;
        this._tex1 = new Compute_Texture(this._gl, width, internalFormat, baseFormat, type);
        this._tex2 = new Compute_Texture(this._gl, width, internalFormat, baseFormat, type);
        this._rTex = this._tex1;
        this._wTex = this._tex2;
    }

    get getRead() { return this._rTex }

    setAsRenderTarget(): void {
        this._wTex.setAsRenderTarget();
    }

    unsetRenderTarget(): void {
        this._wTex.unsetRenderTarget();
    }

    destroy(): void {
        this._rTex.destroy();
        this._wTex.destroy();
    }

    swap(): void {
        const t = this._rTex;
        this._rTex = this._wTex;
        this._wTex = t;
    }
}