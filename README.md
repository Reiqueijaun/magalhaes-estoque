# Magalhães Diesel — controle local

Sistema simples para controlar estoque e registrar produtos procurados pelos clientes. Os dados ficam no arquivo local `magalhaes-data.json`; não depende de internet, instalação de programas ou cadastro em serviços externos.

## Como abrir

No Windows, dê dois cliques em `iniciar.bat`. Em seguida, abra `http://127.0.0.1:8000` no navegador.

O sistema usa apenas PowerShell, que já faz parte do Windows. Para encerrar, feche a janela preta ou pressione `Ctrl+C` nela.

## Rotina sugerida

1. Cadastre o produto e a quantidade mínima desejada.
2. Registre cada entrada e saída no botão **Movimentar estoque**.
3. Quando alguém pedir algo que não está disponível, registre em **Anotar procura**.
4. Use **Relatório de faltas** para fazer reposição e **Mais procurados** para decidir o que vale cadastrar ou comprar.

Faça uma cópia periódica do arquivo `magalhaes-data.json` em um pendrive ou nuvem para manter um backup.
