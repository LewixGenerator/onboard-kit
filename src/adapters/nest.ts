import { All, Controller, DynamicModule, Module, NotFoundException, Req, Res } from "@nestjs/common";
import { handleOnboarding, nodeBody, nodeHeader } from "../handler";
import type { OnboardingOptions } from "../types";

export interface OnboardingModuleOptions extends OnboardingOptions {
  /** Caminho da rota. Padrão: "onboarding". O globalPrefix do app, se houver, é aplicado antes. */
  path?: string;
}

/** Resposta do Express (status/set/send) ou do Fastify (code/headers/send), conforme a plataforma do Nest. */
interface ResponseLike {
  status?(code: number): ResponseLike;
  set?(headers: Record<string, string>): ResponseLike;
  code?(code: number): ResponseLike;
  headers?(headers: Record<string, string>): ResponseLike;
  send(body: string): unknown;
}

/**
 * Módulo NestJS que serve a apresentação do projeto.
 *
 * app.module.ts:
 *   imports: [OnboardingModule.register()]
 */
@Module({})
export class OnboardingModule {
  static register(options: OnboardingModuleOptions = {}): DynamicModule {
    const { path = "onboarding", ...rest } = options;

    @Controller(path)
    class OnboardingController {
      @All()
      async show(@Req() req: any, @Res() res: ResponseLike): Promise<unknown> {
        // Páginas de erro (JSON inválido etc.) também são HTML legível, então sempre devolvemos o corpo.
        const out = await handleOnboarding({ method: req?.method, url: req?.originalUrl ?? req?.url, header: nodeHeader(req?.headers), text: nodeBody(req ?? {}) }, rest);
        if (!out) throw new NotFoundException();
        if (res.code && res.headers) return res.code(out.status).headers!(out.headers).send(out.body);
        return res.status!(out.status).set!(out.headers).send(out.body);
      }
    }

    return { module: OnboardingModule, controllers: [OnboardingController] };
  }
}
