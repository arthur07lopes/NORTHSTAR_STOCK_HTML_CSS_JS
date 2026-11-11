'use strict';

const STORAGE_KEY = 'northstar-stock-v1';
const productForm = document.querySelector('#productForm');
const productRows = document.querySelector('#productRows');
const formMessage = document.querySelector('#formMessage');
const tableMessage = document.querySelector('#tableMessage');
const stockTotal = document.querySelector('#stockTotal');
const productCount = document.querySelector('#productCount');
const unitCount = document.querySelector('#unitCount');

const demoProducts = [
 {
  id: 'demo-notebook',
  name: 'Notebook de demonstração',
  quantity: 4,
  unitPriceCents: 349990,
  imageUrl: 'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?auto=format&fit=crop&w=320&q=80'
 },
 {
  id: 'demo-relogio',
  name: 'Relógio de demonstração',
  quantity: 7,
  unitPriceCents: 52990,
  imageUrl: 'https://images.unsplash.com/photo-1573261821759-fdd1b36d9ca5?auto=format&fit=crop&w=320&q=80'
 }
];

function loadProducts() {
 try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(demoProducts));
   return [...demoProducts];
  }

  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((product) =>
   product && typeof product.id === 'string' &&
   typeof product.name === 'string' &&
   Number.isInteger(product.quantity) && product.quantity >= 0 &&
   Number.isInteger(product.unitPriceCents) && product.unitPriceCents > 0
  );
 } catch (error) {
  return [];
 }
}

let products = loadProducts();

function formatBRL(cents) {
 const value = cents / 100;
 return new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
 }).format(value);
}

function escapeHTML(value) {
 return String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
 })[character]);
}

function safeImageUrl(value) {
 if (!value) return '';
 try {
  const url = new URL(value);
  return url.protocol === 'https:' ? url.href : '';
 } catch (error) {
  return '';
 }
}

function saveProducts() {
 try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  return true;
 } catch (error) {
  formMessage.textContent = 'Não foi possível salvar. Verifique o armazenamento do navegador.';
  return false;
 }
}

function calculateInventory() {
 return products.reduce((summary, product) => {
  summary.totalValueCents += product.quantity * product.unitPriceCents;
  summary.totalUnits += product.quantity;
  return summary;
 }, { totalValueCents: 0, totalUnits: 0 });
}

function updateSummary() {
 const summary = calculateInventory();
 stockTotal.textContent = formatBRL(summary.totalValueCents);
 productCount.textContent = String(products.length);
 unitCount.textContent = String(summary.totalUnits);
}

function renderProducts(focusKey = '') {
 if (products.length === 0) {
  productRows.innerHTML = '<tr><td colspan="5"><div class="empty-state">Nenhum produto cadastrado.<br>Use o formulário ao lado para começar.</div></td></tr>';
  tableMessage.textContent = 'O inventário está vazio.';
 } else {
  productRows.innerHTML = products.map((product) => {
   const imageUrl = safeImageUrl(product.imageUrl);
   const image = imageUrl
    ? `<img class="product-photo" src="${escapeHTML(imageUrl)}" alt="" loading="lazy">`
    : '<span class="product-placeholder" aria-hidden="true">ITEM</span>';
   const totalCents = product.quantity * product.unitPriceCents;
   return `
    <tr>
     <td><div class="product-cell">${image}<span>${escapeHTML(product.name)}</span></div></td>
     <td class="quantity-value">${product.quantity}</td>
     <td class="money">${formatBRL(product.unitPriceCents)}</td>
     <td class="money money-strong">${formatBRL(totalCents)}</td>
     <td>
      <div class="row-actions">
       <button class="action-button" type="button" data-action="decrease" data-id="${escapeHTML(product.id)}" data-focus-key="decrease-${escapeHTML(product.id)}" aria-label="Remover uma unidade de ${escapeHTML(product.name)}" ${product.quantity === 0 ? 'disabled' : ''}>-1</button>
       <button class="action-button" type="button" data-action="increase" data-id="${escapeHTML(product.id)}" data-focus-key="increase-${escapeHTML(product.id)}" aria-label="Adicionar uma unidade a ${escapeHTML(product.name)}">+1</button>
       <button class="action-button delete-button" type="button" data-action="delete" data-id="${escapeHTML(product.id)}" data-focus-key="delete-${escapeHTML(product.id)}" aria-label="Excluir ${escapeHTML(product.name)}">Excluir</button>
      </div>
     </td>
    </tr>`;
  }).join('');
  tableMessage.textContent = `${products.length} produto(s) listado(s).`;
  productRows.querySelectorAll('img.product-photo').forEach((image) => {
   image.addEventListener('error', () => {
    const placeholder = document.createElement('span');
    placeholder.className = 'product-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = 'ITEM';
    image.replaceWith(placeholder);
   }, { once: true });
  });
 }

 updateSummary();
 if (focusKey) {
  const control = [...document.querySelectorAll('[data-focus-key]')]
   .find((element) => element.dataset.focusKey === focusKey);
  (control || document.querySelector('#productName')).focus();
 }
}

productForm.addEventListener('submit', (event) => {
 event.preventDefault();
 if (!productForm.reportValidity()) return;

 const formData = new FormData(productForm);
 const name = String(formData.get('name')).trim();
 const quantity = Number(formData.get('quantity'));
 const priceInput = Number(formData.get('price'));
 const unitPriceCents = Math.round(priceInput * 100);
 const rawImage = String(formData.get('image')).trim();
 const imageUrl = safeImageUrl(rawImage);

 if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(priceInput) || priceInput <= 0 || !Number.isInteger(unitPriceCents) || unitPriceCents <= 0) {
  formMessage.textContent = 'Confira o nome, a quantidade inteira e o preço maior que zero.';
  return;
 }
 if (rawImage && !imageUrl) {
  formMessage.textContent = 'A imagem precisa usar um endereço HTTPS válido.';
  return;
 }

 products.push({
  id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  name,
  quantity,
  unitPriceCents,
  imageUrl
 });

 saveProducts();
 renderProducts();
 formMessage.textContent = `${name} foi adicionado ao inventário.`;
 productForm.reset();
 document.querySelector('#productName').focus();
});

productRows.addEventListener('click', (event) => {
 const button = event.target.closest('button[data-action]');
 if (!button) return;

 const product = products.find((item) => item.id === button.dataset.id);
 if (!product) return;

 const action = button.dataset.action;
 if (action === 'increase') {
  product.quantity += 1;
 } else if (action === 'decrease' && product.quantity > 0) {
  product.quantity -= 1;
 } else if (action === 'delete') {
  const confirmed = window.confirm(`Excluir ${product.name} do inventário?`);
  if (!confirmed) return;
  products = products.filter((item) => item.id !== product.id);
  saveProducts();
  renderProducts('');
  document.querySelector('#productName').focus();
  formMessage.textContent = `${product.name} foi excluído.`;
  return;
 }

 saveProducts();
 renderProducts(button.dataset.focusKey);
 formMessage.textContent = `Quantidade de ${product.name}: ${product.quantity}.`;
});

renderProducts();
