import { Controller, DynamicModule, Get, Header, Module, NotFoundException } from "@nestjs/common";
import { HTML_HEADERS, renderOnboardingPage } from "../index";
import { resolveEnabled } from "../load";
import type { OnboardingOptions } from "../types";

export interface OnboardingModuleOptions extends OnboardingOptions {
  /** Caminho da rota. Padrão: "onboarding". O globalPrefix do app, se houver, é aplicado antes. */
  path?: string;
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
      @Get()
      @Header("Content-Type", HTML_HEADERS["Content-Type"])
      @Header("Cache-Control", HTML_HEADERS["Cache-Control"])
      @Header("X-Robots-Tag", HTML_HEADERS["X-Robots-Tag"])
      async show(): Promise<string> {
        if (!resolveEnabled(rest)) throw new NotFoundException();
        // Páginas de erro (JSON inválido etc.) também são HTML legível, então sempre devolvemos o corpo.
        const page = await renderOnboardingPage(rest.file);
        return page.html;
      }
    }

    return { module: OnboardingModule, controllers: [OnboardingController] };
  }
}
