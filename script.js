const STORAGE_KEY = "mala_direta_cadastros";

let cadastros = carregarCadastros();
let indiceEditando = null;

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

function normalizarNome(nome) {
  return String(nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderizarLista() {
  contador.textContent = cadastros.length;

  const pesquisa = normalizarNome(
    document.getElementById("pesquisaCadastro").value
  );

  const cadastrosOrdenados = cadastros
    .map((pessoa, index) => ({ pessoa, index }))
    .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR", { sensitivity: "base" }));

  const resultados = cadastrosOrdenados.filter(({ pessoa }) =>
    normalizarNome(pessoa.nome).includes(pesquisa)
  );

  if (!resultados.length) {
    lista.innerHTML = pesquisa ? `
      <div class="empty">
        <div class="empty-icon">🔎</div>
        <strong>Nenhum cadastro encontrado</strong>
        <span>Não encontramos nenhum registro para "${escaparHtml(pesquisa)}".</span>
      </div>` : `
      <div class="empty">
        <div class="empty-icon">＋</div>
        <strong>Nenhum cadastro ainda</strong>
        <span>Adicione a primeira pessoa pelo formulário.</span>
      </div>`;
    return;
  }

  lista.innerHTML = resultados.map(({ pessoa, index }) => `
    <div class="person">
      <div class="person-info">
        <strong>${escaparHtml(pessoa.nome)}</strong>
        <span>${escaparHtml(pessoa.telefone || "Telefone não informado")} · ${escaparHtml(pessoa.cidade || "Cidade não informada")}</span>
      </div>
      <div class="person-actions">
        <button class="edit-btn" type="button" data-index="${index}" title="Editar cadastro" aria-label="Editar cadastro">✎</button>
        <button class="delete-btn" type="button" data-index="${index}" title="Excluir cadastro" aria-label="Excluir cadastro">×</button>
      </div>
    </div>
  `).join("");
}

function limparFormulario() {
  form.reset();
  indiceEditando = null;

  const botao = form.querySelector('button[type="submit"]');
  botao.textContent = "+ Adicionar cadastro";
  document.getElementById("nome").focus();
}

function preencherFormulario(pessoa) {
  document.getElementById("nome").value = pessoa.nome || "";
  document.getElementById("dataNascimento").value = pessoa.dataNascimento || "";
  document.getElementById("telefone").value = pessoa.telefone || "";
  document.getElementById("endereco").value = pessoa.endereco || "";
  document.getElementById("bairro").value = pessoa.bairro || "";
  document.getElementById("cidade").value = pessoa.cidade || "";
  document.getElementById("cep").value = pessoa.cep || "";
  document.getElementById("estado").value = pessoa.estado || "";
  document.getElementById("observacoes").value = pessoa.observacoes || "";

  indiceEditando = cadastros.indexOf(pessoa);

  const botao = form.querySelector('button[type="submit"]');
  botao.textContent = "✓ Salvar alterações";

  window.scrollTo({ top: 0, behavior: "smooth" });
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

  const nomeNormalizado = normalizarNome(pessoa.nome);
  const nomeDuplicado = cadastros.some((cadastro, index) => {
    if (indiceEditando !== null && index === indiceEditando) return false;
    return normalizarNome(cadastro.nome) === nomeNormalizado;
  });

  if (nomeDuplicado) {
    mostrarStatus(`Já existe um cadastro para "${pessoa.nome}".`, "error");
    document.getElementById("nome").focus();
    return;
  }

  if (indiceEditando !== null) {
    cadastros[indiceEditando] = pessoa;
    mostrarStatus("Cadastro atualizado com sucesso.", "success");
  } else {
    cadastros.push(pessoa);
    mostrarStatus("Cadastro adicionado com sucesso.", "success");
  }

  salvarCadastros();
  renderizarLista();
  limparFormulario();
});

document.getElementById("limparFormulario").addEventListener("click", () => {
  limparFormulario();
  mostrarStatus("");
});

lista.addEventListener("click", (event) => {
  const editar = event.target.closest(".edit-btn");
  const excluir = event.target.closest(".delete-btn");

  if (editar) {
    const index = Number(editar.dataset.index);
    preencherFormulario(cadastros[index]);
    return;
  }

  if (excluir) {
    const index = Number(excluir.dataset.index);
    const pessoa = cadastros[index];

    if (confirm(`Excluir o cadastro de "${pessoa.nome}"?`)) {
      cadastros.splice(index, 1);

      if (indiceEditando === index) {
        limparFormulario();
      } else if (indiceEditando !== null && index < indiceEditando) {
        indiceEditando--;
      }

      salvarCadastros();
      renderizarLista();
      mostrarStatus("Cadastro excluído.", "success");
    }
  }
});

document.getElementById("pesquisaCadastro").addEventListener("input", () => {
  renderizarLista();
});

document.getElementById("limparTodos").addEventListener("click", () => {
  if (!cadastros.length) return;

  if (confirm("Tem certeza que deseja excluir todos os cadastros?")) {
    cadastros = [];
    limparFormulario();
    salvarCadastros();
    renderizarLista();
    mostrarStatus("Todos os cadastros foram excluídos.", "success");
  }
});

function substituirCampos(texto, pessoa) {
  const dados = {
    NOME: pessoa.nome,
    DATA_NASCIMENTO: formatarData(pessoa.dataNascimento),
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

function bibliotecasDisponiveis() {
  return typeof docx !== "undefined" &&
         typeof docx.Document !== "undefined" &&
         typeof docx.Packer !== "undefined" &&
         typeof saveAs !== "undefined";
}

async function gerarWord() {
  if (!cadastros.length) {
    mostrarStatus("Adicione pelo menos um cadastro antes de gerar o Word.", "error");
    return;
  }

  if (!bibliotecasDisponiveis()) {
    mostrarStatus("As bibliotecas do Word não foram carregadas. Verifique a pasta libs/.", "error");
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
    const dataArquivo =
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

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

async function gerarEtiquetas() {
  if (!cadastros.length) {
    mostrarStatus("Adicione pelo menos um cadastro antes de gerar as etiquetas.", "error");
    return;
  }

  if (!bibliotecasDisponiveis()) {
    mostrarStatus("As bibliotecas do Word não foram carregadas. Verifique a pasta libs/.", "error");
    return;
  }

  const botao = document.getElementById("gerarEtiquetas");
  botao.disabled = true;
  botao.textContent = "Gerando etiquetas...";

  try {
    const COLUNAS = 3;
    const LINHAS = 6;
    const POR_PAGINA = COLUNAS * LINHAS;

    const modeloEtiqueta = `{{NOME}}
{{ENDERECO}}
{{BAIRRO}} - {{CIDADE}}/{{ESTADO}}
CEP: {{CEP}}`;

    const paginas = [];

    for (let inicio = 0; inicio < cadastros.length; inicio += POR_PAGINA) {
      const grupo = cadastros.slice(inicio, inicio + POR_PAGINA);
      const rows = [];

      for (let linha = 0; linha < LINHAS; linha++) {
        const cells = [];

        for (let coluna = 0; coluna < COLUNAS; coluna++) {
          const index = linha * COLUNAS + coluna;
          const pessoa = grupo[index];

          if (pessoa) {
            const texto = substituirCampos(modeloEtiqueta, pessoa);

            cells.push(
              new docx.TableCell({
                width: {
                  size: 4500,
                  type: docx.WidthType.DXA
                },
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 120,
                  right: 120
                },
                children: textoParaParagrafosEtiqueta(texto)
              })
            );
          } else {
            cells.push(
              new docx.TableCell({
                width: {
                  size: 4500,
                  type: docx.WidthType.DXA
                },
                children: [new docx.Paragraph({ text: "" })]
              })
            );
          }
        }

        rows.push(new docx.TableRow({ children: cells }));
      }

      paginas.push({
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838
            },
            margin: {
              top: 500,
              right: 500,
              bottom: 500,
              left: 500
            }
          }
        },
        children: [
          new docx.Table({
            width: {
              size: 9000,
              type: docx.WidthType.DXA
            },
            rows
          })
        ]
      });
    }

    const documento = new docx.Document({
      sections: paginas
    });

    const blob = await docx.Packer.toBlob(documento);
    const data = new Date();
    const dataArquivo =
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

    saveAs(blob, `etiquetas-${dataArquivo}.docx`);
    mostrarStatus(`Etiquetas geradas com ${cadastros.length} cadastro(s).`, "success");
  } catch (erro) {
    console.error(erro);
    mostrarStatus("Não foi possível gerar o arquivo de etiquetas.", "error");
  } finally {
    botao.disabled = false;
    botao.textContent = "🏷️ Gerar etiquetas em Word";
  }
}

function textoParaParagrafosEtiqueta(texto) {
  return texto.split(/\r?\n/).map(linha => new docx.Paragraph({
    children: [
      new docx.TextRun({
        text: linha || " ",
        size: 18
      })
    ],
    alignment: docx.AlignmentType.LEFT,
    spacing: {
      after: 30,
      line: 220
    }
  }));
}

document.getElementById("gerarWord").addEventListener("click", gerarWord);
document.getElementById("gerarEtiquetas").addEventListener("click", gerarEtiquetas);

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

  if (typeof saveAs === "undefined") {
    mostrarStatus("O FileSaver não foi carregado. Verifique a pasta libs/.", "error");
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

    const validos = [];
    const nomesImportados = new Set();

    for (const item of dados) {
      if (!item || typeof item !== "object" || !item.nome) continue;
      const nome = normalizarNome(item.nome);
      if (nomesImportados.has(nome)) continue;
      nomesImportados.add(nome);
      validos.push(item);
    }

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
