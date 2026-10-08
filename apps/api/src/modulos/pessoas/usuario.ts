import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ColaboradorComCargo, PessoasApi } from './pessoas.api';

const PUBLICO = 'rota-publica';
const SOMENTE_GESTOR = 'somente-gestor';

/** Rota acessível sem usuário identificado. */
export const Publico = () => SetMetadata(PUBLICO, true);
/** Rota restrita ao perfil gestor (administrador). */
export const SomenteGestor = () => SetMetadata(SOMENTE_GESTOR, true);

/** Usuário que fez a requisição. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request & { usuario: ColaboradorComCargo }>().usuario,
);

export type Usuario = ColaboradorComCargo;

/**
 * Identificação simplificada para o protótipo: o front envia o cabeçalho X-Usuario-Id.
 * Para produção, trocar por login (ex.: JWT) mantendo a mesma interface (UsuarioAtual).
 */
@Injectable()
export class UsuarioGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly pessoas: PessoasApi,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO, alvos)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { usuario?: ColaboradorComCargo }>();
    const id = Number(req.header('x-usuario-id'));
    const usuario = Number.isInteger(id) && id > 0 ? await this.pessoas.obter(id) : null;
    if (!usuario) throw new UnauthorizedException({ mensagem: 'Selecione um usuário para continuar' });
    req.usuario = usuario;

    if (this.reflector.getAllAndOverride<boolean>(SOMENTE_GESTOR, alvos) && usuario.perfil !== 'gestor') {
      throw new ForbiddenException({ mensagem: 'Disponível apenas para o gestor' });
    }
    return true;
  }
}

/** Colaborador só acessa os próprios dados; gestor acessa os de todos. */
export function garantirAcesso(usuario: Usuario, colaboradorId: number): void {
  if (usuario.perfil !== 'gestor' && usuario.id !== colaboradorId) {
    throw new ForbiddenException({ mensagem: 'Você só pode acessar os seus próprios dados' });
  }
}
