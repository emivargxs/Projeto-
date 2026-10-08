import { Controller, Get } from '@nestjs/common';
import { IndicadoresColaborador, IndicadoresOrganizacao } from '@cestacorp/contracts';
import { SomenteGestor, Usuario, UsuarioAtual } from '../pessoas';
import { CalcularIndicadores } from './casos-de-uso/calcular-indicadores';

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadores: CalcularIndicadores) {}

  @SomenteGestor()
  @Get('organizacao')
  daOrganizacao(): Promise<IndicadoresOrganizacao> {
    return this.indicadores.daOrganizacao();
  }

  @Get('meus')
  meus(@UsuarioAtual() usuario: Usuario): Promise<IndicadoresColaborador> {
    return this.indicadores.doColaborador(usuario);
  }
}
