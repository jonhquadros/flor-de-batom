
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MessageCircle, CheckCircle2, Copy, ArrowLeft, RefreshCw } from 'lucide-react';
import { Presente } from '@/types/presente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { getNextOrderNumber, saveOrderToFirestore } from '@/lib/storage-utils';
import { Order } from '@/lib/types';

const WHATSAPP_LOJA = '5591987199039';
const PIX_KEY = '91987199039';

interface Props {
  presente: Presente;
  onVoltar: () => void;
  onReiniciar: () => void;
}

export function PassoFinalizacao({ presente, onVoltar, onReiniciar }: Props) {
  const db = useFirestore();
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [pagamento, setPagamento] = useState<'Pix' | 'Dinheiro' | 'Cartão Débito' | 'Cartão Crédito'>('Pix');
  const [enviado, setEnviado] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { embalagem, itens, totalFinal } = presente;

  const handleEnviar = async () => {
    if (!nome || !whatsapp || !endereco) {
      toast({ 
        variant: "destructive", 
        title: "Dados incompletos", 
        description: "Por favor, preencha seu nome, WhatsApp e endereço." 
      });
      return;
    }

    if (!db) return;

    setIsProcessing(true);
    try {
      // 1. Obter número sequencial global
      const orderNum = await getNextOrderNumber(db);
      const orderId = `ORD-${Date.now()}-${orderNum}`;

      // 2. Mapear itens para o formato do pedido
      const orderItems = [
        {
          id: embalagem.id,
          name: embalagem.name,
          price: embalagem.price,
          imageUrl: embalagem.imageUrl,
          category: embalagem.category,
          quantity: 1,
          selectedColor: '',
          isFeatured: false,
          description: embalagem.description || '',
          stock: 0
        },
        ...itens.map(i => ({
          id: i.produtoId,
          name: i.nome,
          price: i.preco,
          imageUrl: i.imagem,
          category: i.categoria,
          quantity: i.quantidade,
          selectedColor: i.corSelecionada || '',
          isFeatured: false,
          description: '',
          stock: 0
        }))
      ];

      const orderData: Order = {
        id: orderId,
        orderNumber: orderNum,
        customerName: nome,
        customerPhone: whatsapp,
        customerAddress: endereco,
        items: orderItems as any,
        total: totalFinal,
        paymentMethod: pagamento,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
        source: 'catalog'
      };

      // 3. Salvar no Firestore e aguardar conclusão antes de abrir o WhatsApp
      await saveOrderToFirestore(db, orderData);

      // 4. Preparar mensagem do WhatsApp
      const listaItens = itens.map(i => {
        const labelCor = i.corSelecionada ? ` [${i.corSelecionada}]` : '';
        return `• ${i.name}${labelCor} x${i.quantity} — R$ ${(i.preco * i.quantity).toFixed(2).replace('.', ',')}`;
      }).join('\n');
      
      const linhaPagamento = pagamento === 'Pix' 
        ? '📱 Pix — comprovante a enviar' 
        : pagamento === 'Dinheiro' ? '💵 Dinheiro' : `💳 ${pagamento}`;

      const msg = encodeURIComponent(
        `🌸 *NOVO PEDIDO #${orderNum} - Flor de Batom Makeup*\n\n` +
        `👤 *Cliente:* ${nome}\n` +
        `📱 *WhatsApp:* ${whatsapp}\n` +
        `📍 *Endereço:* ${endereco}\n\n` +
        `🎁 *PRESENTE PERSONALIZADO:*\n` +
        `📦 *Embalagem:* ${embalagem.name} (R$ ${embalagem.price.toFixed(2).replace('.', ',')})\n` +
        `🛍️ *Produtos:*\n${listaItens}\n\n` +
        `💰 *TOTAL: R$ ${totalFinal.toFixed(2).replace('.', ',')}*\n` +
        `💳 *Pagamento:* ${linhaPagamento}\n` +
        (mensagem.trim() ? `\n💌 *Mensagem no Cartão:* "${mensagem.trim()}"` : '') +
        `\n\n_Enviado pelo montador de presentes online_`
      );

      window.open(`https://wa.me/${WHATSAPP_LOJA}?text=${msg}`, '_blank');
      setEnviado(true);
      toast({ title: "Pedido Registrado!", description: "Seu presente foi salvo e enviado para o WhatsApp." });
    } catch (error) {
      console.error("Erro ao finalizar presente:", error);
      toast({ variant: "destructive", title: "Erro no processamento", description: "Não foi possível salvar seu pedido." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (enviado) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="h-24 w-24 bg-green-100 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-green-100">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-primary">Pedido Enviado!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">Seu presente foi registrado e enviado para o nosso WhatsApp. Em breve entraremos em contato 🌸</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button className="h-14 rounded-2xl bg-primary text-xs font-black uppercase" onClick={onReiniciar}>
            <RefreshCw className="h-4 w-4 mr-2" /> Montar outro presente
          </Button>
          <Button variant="ghost" className="text-[10px] font-black uppercase text-primary" onClick={() => window.location.href = '/'}>
            Voltar para a Loja
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-headline text-3xl text-primary">Finalize seu Kit</h3>
          <p className="text-muted-foreground text-sm">Falta pouco para criarmos este presente especial ✨</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-primary/60 ml-1">Seu Nome *</Label>
            <Input className="h-12 rounded-2xl bg-white border-none shadow-sm" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-primary/60 ml-1">Seu WhatsApp *</Label>
            <Input className="h-12 rounded-2xl bg-white border-none shadow-sm" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(91) 98888-8888" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-primary/60 ml-1">Endereço de Entrega *</Label>
            <Textarea 
              className="min-h-[80px] rounded-2xl bg-white border-none shadow-sm resize-none" 
              value={endereco} 
              onChange={e => setEndereco(e.target.value)} 
              placeholder="Rua, Número, Bairro e Ponto de Referência" 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-primary/60 ml-1">Mensagem no Cartão (Opcional)</Label>
            <Textarea 
              className="min-h-[100px] rounded-2xl bg-white border-none shadow-sm resize-none" 
              value={mensagem} 
              onChange={e => setMensagem(e.target.value)} 
              placeholder="Escreva algo especial para quem vai receber o presente..." 
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase text-primary/60 ml-1">Forma de Pagamento *</Label>
          <RadioGroup value={pagamento} onValueChange={(v: any) => setPagamento(v)} className="grid grid-cols-2 gap-3">
            {[
              { id: 'Pix', label: 'Pix', icon: '📱' },
              { id: 'Dinheiro', label: 'Dinheiro', icon: '💵' },
              { id: 'Cartão Débito', label: 'Débito', icon: '💳' },
              { id: 'Cartão Crédito', label: 'Crédito', icon: '💳' }
            ].map(m => (
              <div key={m.id} className={`flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer ${pagamento === m.id ? 'border-primary bg-primary/5 shadow-md' : 'border-muted bg-white'}`} onClick={() => setPagamento(m.id as any)}>
                <RadioGroupItem value={m.id} id={m.id} className="sr-only" />
                <span className="text-xl">{m.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
              </div>
            ))}
          </RadioGroup>
        </div>

        {pagamento === 'Pix' && (
          <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 text-center space-y-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Chave Pix (Celular)</span>
            <button 
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-white rounded-xl border border-primary/20 text-primary font-bold shadow-sm active:scale-95 transition-all"
              onClick={() => {
                navigator.clipboard.writeText(PIX_KEY);
                toast({ title: "Chave Copiada!", description: "A chave Pix foi copiada com sucesso." });
              }}
            >
              (91) 98719-9039 <Copy className="h-3 w-3 opacity-50" />
            </button>
            <p className="text-[9px] text-primary/60 italic">Confirme o pagamento enviando o comprovante no WhatsApp.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-primary/5 p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b">
            <h4 className="font-bold text-primary text-base uppercase tracking-widest">Resumo do Presente</h4>
            <span className="text-[10px] font-black text-primary/40 uppercase bg-primary/5 px-3 py-1 rounded-full">{itens.length + 1} itens</span>
          </div>

          <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex gap-4 items-center opacity-80">
              <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden border shrink-0 relative">
                <Image src={embalagem.imageUrl} alt="" fill className="object-cover" />
              </div>
              <p className="flex-1 text-[10px] font-bold text-primary uppercase truncate">{embalagem.name}</p>
              <p className="text-xs font-bold text-primary">R$ {embalagem.price.toFixed(2)}</p>
            </div>
            {itens.map((item, idx) => (
              <div key={`${item.produtoId}-${item.corSelecionada || idx}`} className="flex gap-4 items-center">
                <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden border shrink-0 relative">
                  <Image src={item.imagem} alt="" fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary truncate uppercase">{item.nome}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.quantidade}x un.</p>
                    {item.corSelecionada && <span className="text-[8px] font-black text-primary/60 uppercase">{item.corSelecionada}</span>}
                  </div>
                </div>
                <p className="text-xs font-bold text-primary">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t space-y-4">
            <div className="flex justify-between items-center text-2xl font-bold text-primary">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Total</span>
              <span>R$ {totalFinal.toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                className="h-16 rounded-2xl bg-primary text-sm font-black uppercase shadow-xl shadow-primary/20 gap-3" 
                onClick={handleEnviar}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="h-6 w-6" /> Finalizar Pedido
                  </>
                )}
              </Button>
              <Button variant="ghost" className="h-12 text-[10px] font-black uppercase text-primary/60" onClick={onVoltar} disabled={isProcessing}>
                <ArrowLeft className="h-3 w-3 mr-2" /> Editar Presente
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
