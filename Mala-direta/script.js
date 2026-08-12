const STORAGE_KEY = "mala_direta_cadastros";

let cadastros = carregarCadastros();

const form = document.getElementById("formCadastro");
const lista = document.getElementById("listaCadastros");
const contador = document.getElementById("contador");
const modelo = document.getElementById("modelo");
const statusEl = document.getElementById("status");

function carregarCadastros() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function salvarCadastros() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cadastros));
}

function valor(id) {
  return document.getElementById(id).value.trim();
}

function formatarData(data) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderizarLista() {
  contador.textContent = cadastros.length;

  if (!cadastros.length) {
    lista.innerHTML = `
      <div class="empty">
        <div class="empty-icon">＋</div>
        <strong>Nenhum cadastro ainda</strong>
        <span>Adicione a primeira pessoa pelo formulário.</span>
      </div>`;
    return;
  }

  lista.innerHTML = cadastros.map((pessoa, index) => `
    <div class="person">
      <div class="person-info">
        <strong>${escaparHtml(pessoa.nome)}</strong>
        <span>${escaparHtml(pessoa.cpf || "CPF não informado")} · ${escaparHtml(pessoa.cidade || "Cidade não informada")}</span>
      </div>
      <button class="delete-btn" type="button" data-index="${index}" title="Excluir">×</button>
    </div>
  `).join("");
}

function limparFormulario() {
  form.reset();
  document.getElementById("nome").focus();
}

function mostrarStatus(mensagem, tipo = "") {
  statusEl.textContent = mensagem;
  statusEl.className = `status ${tipo}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const pessoa = {
    nome: valor("nome"),
    dataNascimento: valor("dataNascimento"),
    rg: valor("rg"),
    cpf: valor("cpf"),
    telefone: valor("telefone"),
    endereco: valor("endereco"),
    bairro: valor("bairro"),
    cidade: valor("cidade"),
    cep: valor("cep"),
    estado: valor("estado").toUpperCase(),
    observacoes: valor("observacoes")
  };

  if (!pessoa.nome) {
    mostrarStatus("Informe o nome completo.", "error");
    return;
  }

  cadastros.push(pessoa);
  salvarCadastros();
  renderizarLista();
  limparFormulario();
  mostrarStatus("Cadastro adicionado com sucesso.", "success");
});

document.getElementById("limparFormulario").addEventListener("click", () => {
  limparFormulario();
  mostrarStatus("");
});

lista.addEventListener("click", (event) => {
  const botao = event.target.closest(".delete-btn");
  if (!botao) return;

  const index = Number(botao.dataset.index);
  const pessoa = cadastros[index];

  if (confirm(`Excluir o cadastro de "${pessoa.nome}"?`)) {
    cadastros.splice(index, 1);
    salvarCadastros();
    renderizarLista();
    mostrarStatus("Cadastro excluído.", "success");
  }
});

document.getElementById("limparTodos").addEventListener("click", () => {
  if (!cadastros.length) return;

  if (confirm("Tem certeza que deseja excluir todos os cadastros?")) {
    cadastros = [];
    salvarCadastros();
    renderizarLista();
    mostrarStatus("Todos os cadastros foram excluídos.", "success");
  }
});

function substituirCampos(texto, pessoa) {
  const dados = {
    NOME: pessoa.nome,
    DATA_NASCIMENTO: formatarData(pessoa.dataNascimento),
    RG: pessoa.rg,
    CPF: pessoa.cpf,
    TELEFONE: pessoa.telefone,
    ENDERECO: pessoa.endereco,
    BAIRRO: pessoa.bairro,
    CIDADE: pessoa.cidade,
    CEP: pessoa.cep,
    ESTADO: pessoa.estado,
    OBSERVACOES: pessoa.observacoes
  };

  return texto.replace(/\{\{([A-Z_]+)\}\}/g, (match, chave) => {
    return dados[chave] ?? match;
  });
}

function textoParaParagrafos(texto) {
  return texto.split(/\r?\n/).map(linha => new docx.Paragraph({
    children: [
      new docx.TextRun({
        text: linha || " ",
        size: 24
      })
    ],
    spacing: {
      after: 120
    }
  }));
}

async function gerarWord() {
  if (!cadastros.length) {
    mostrarStatus("Adicione pelo menos um cadastro antes de gerar o Word.", "error");
    return;
  }

  if (typeof docx === "undefined" || typeof saveAs === "undefined") {
    mostrarStatus("As bibliotecas do Word não foram carregadas. Verifique sua conexão com a internet.", "error");
    return;
  }

  const textoModelo = modelo.value.trim();

  if (!textoModelo) {
    mostrarStatus("Digite um modelo para a mala direta.", "error");
    return;
  }

  const botao = document.getElementById("gerarWord");
  botao.disabled = true;
  botao.textContent = "Gerando Word...";

  try {
    const children = [];

    cadastros.forEach((pessoa, index) => {
      const texto = substituirCampos(textoModelo, pessoa);

      children.push(
        new docx.Paragraph({
          text: `MALA DIRETA — ${pessoa.nome}`,
          heading: docx.HeadingLevel.HEADING_1,
          spacing: { after: 220 }
        }),
        ...textoParaParagrafos(texto)
      );

      if (index < cadastros.length - 1) {
        children.push(
          new docx.Paragraph({
            children: [new docx.PageBreak()]
          })
        );
      }
    });

    const documento = new docx.Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000
            }
          }
        },
        children
      }]
    });

    const blob = await docx.Packer.toBlob(documento);
    const data = new Date();
    const dataArquivo = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

    saveAs(blob, `mala-direta-${dataArquivo}.docx`);
    mostrarStatus(`Word gerado com ${cadastros.length} cadastro(s).`, "success");
  } catch (erro) {
    console.error(erro);
    mostrarStatus("Não foi possível gerar o arquivo Word.", "error");
  } finally {
    botao.disabled = false;
    botao.innerHTML = "<span>⇩</span> Converter e baixar Word";
  }
}

document.getElementById("gerarWord").addEventListener("click", gerarWord);

document.querySelectorAll(".tag").forEach(tag => {
  tag.addEventListener("click", () => {
    const placeholder = tag.dataset.placeholder;
    const start = modelo.selectionStart;
    const end = modelo.selectionEnd;

    modelo.value =
      modelo.value.substring(0, start) +
      placeholder +
      modelo.value.substring(end);

    modelo.focus();
    modelo.selectionStart = modelo.selectionEnd = start + placeholder.length;
  });
});

document.getElementById("exportarJson").addEventListener("click", () => {
  if (!cadastros.length) {
    mostrarStatus("Não há cadastros para exportar.", "error");
    return;
  }

  const blob = new Blob(
    [JSON.stringify(cadastros, null, 2)],
    { type: "application/json;charset=utf-8" }
  );

  saveAs(blob, "cadastros-mala-direta.json");
  mostrarStatus("Dados exportados.", "success");
});

document.getElementById("importarJson").addEventListener("change", async (event) => {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  try {
    const texto = await arquivo.text();
    const dados = JSON.parse(texto);

    if (!Array.isArray(dados)) {
      throw new Error("Formato inválido.");
    }

    const validos = dados.filter(item => item && typeof item === "object" && item.nome);

    if (!validos.length) {
      throw new Error("Nenhum cadastro válido encontrado.");
    }

    cadastros = validos;
    salvarCadastros();
    renderizarLista();
    mostrarStatus(`${validos.length} cadastro(s) importado(s).`, "success");
  } catch (erro) {
    console.error(erro);
    mostrarStatus("Não foi possível importar esse arquivo JSON.", "error");
  }

  event.target.value = "";
});

document.getElementById("cpf").addEventListener("input", (event) => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  event.target.value = v;
});

document.getElementById("cep").addEventListener("input", (event) => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 8);
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  event.target.value = v;
});

document.getElementById("telefone").addEventListener("input", (event) => {
  let v = event.target.value.replace(/\D/g, "").slice(0, 11);

  if (v.length <= 10) {
    v = v.replace(/(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    v = v.replace(/(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
  }

  event.target.value = v;
});

renderizarLista();
