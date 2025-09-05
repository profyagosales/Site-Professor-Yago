import { Page } from '@/components/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { 
  GabaritosEmBranco, 
  AplicacoesGabarito, 
  ProcessamentoOMR 
} from '@/components/gabarito';

export default function GabaritoProf() {
  const [activeTab, setActiveTab] = useState<'gabaritos' | 'aplicacoes' | 'processamento'>('gabaritos');

  const tabs = [
    {
      id: 'gabaritos' as const,
      label: 'Gabaritos em Branco',
      description: 'Criar e gerenciar modelos de gabaritos'
    },
    {
      id: 'aplicacoes' as const,
      label: 'Aplicações',
      description: 'Associar gabaritos a turmas e datas'
    },
    {
      id: 'processamento' as const,
      label: 'Processamento OMR',
      description: 'Upload e correção automática de folhas'
    }
  ];

  return (
    <Page title="Centro de Gabaritos" subtitle="Criação, aplicação e processamento de provas objetivas">
      <div className="space-y-6">
        {/* Navegação por abas */}
        <Card className="p-1">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75 mt-1">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Conteúdo das abas */}
        <div className="space-y-6">
          {activeTab === 'gabaritos' && <GabaritosEmBranco />}
          {activeTab === 'aplicacoes' && <AplicacoesGabarito />}
          {activeTab === 'processamento' && <ProcessamentoOMR />}
        </div>
      </div>
    </Page>
  );
}