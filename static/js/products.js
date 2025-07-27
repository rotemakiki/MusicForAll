// Products Page JavaScript
let allProducts = [];
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
});

function setupEventListeners() {
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('addProductModal');
        if (event.target === modal) {
            closeAddProductModal();
        }
    }
}

async function loadProducts() {
    try {
        showLoading();
        const response = await fetch('/api/products');

        if (!response.ok) {
            throw new Error('Failed to load products');
        }

        allProducts = await response.json();
        filteredProducts = [...allProducts];
        displayProducts(filteredProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        showError('שגיאה בטעינת המוצרים');
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productsGrid');

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-guitar"></i>
                <h3>אין מוצרים להצגה</h3>
                <p>נסה לשנות את החיפוש או הפילטרים</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const categoryNames = {
        'instruments': 'כלי נגינה',
        'accessories': 'אביזרים',
        'audio': 'ציוד אודיו'
    };

    const isAdmin = window.userRoles && window.userRoles.includes('admin');
    const deleteButton = isAdmin ?
        `<button class="delete-btn" onclick="deleteProduct('${product.id}')" title="מחק מוצר">
            <i class="fas fa-trash"></i>
        </button>` : '';

    // Create safe image URL with proper fallback
    const imageUrl = product.image || '/static/images/placeholder-product.jpg';

    return `
        <div class="product-card" data-category="${product.category}">
            <img src="${imageUrl}" alt="${product.name}" class="product-image"
                 onload="this.style.opacity='1'"
                 onerror="this.src='/static/images/placeholder-product.jpg'; this.style.opacity='1'"
                 style="opacity:0; transition: opacity 0.3s ease;">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>

                <div class="product-meta">
                    <div class="product-rating">
                        <span class="rating-stars">${generateStars(product.rating)}</span>
                        <span class="rating-number">${product.rating}</span>
                    </div>
                    ${product.price ? `<span class="product-price">$${product.price}</span>` : ''}
                    <span class="product-category">${categoryNames[product.category] || product.category}</span>
                </div>

                <div class="product-actions">
                    <a href="${product.aliexpress_link}" target="_blank" class="aliexpress-btn">
                        <i class="fas fa-external-link-alt"></i>
                        קנה באלי אקספרס
                    </a>
                    ${deleteButton}
                </div>
            </div>
        </div>
    `;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }

    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }

    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }

    return stars;
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );

    displayProducts(filteredProducts);
}

function filterByCategory(category) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => product.category === category);
    }

    // Apply search filter if exists
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }

    displayProducts(filteredProducts);
}

function openAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('addProductForm').reset();
}

async function addProduct(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value,
        aliexpress_link: document.getElementById('productAliexpressLink').value,
        category: document.getElementById('productCategory').value,
        rating: parseFloat(document.getElementById('productRating').value),
        price: parseFloat(document.getElementById('productPrice').value) || null
    };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to add product');
        }

        // Add to local array
        const newProduct = {
            ...formData,
            id: result.id,
            created_at: new Date().toISOString()
        };

        allProducts.unshift(newProduct);
        filteredProducts = [...allProducts];

        displayProducts(filteredProducts);
        closeAddProductModal();
        showSuccess('המוצר נוסף בהצלחה!');

    } catch (error) {
        console.error('Error adding product:', error);
        showError(`שגיאה בהוספת המוצר: ${error.message}`);
    }
}

async function deleteProduct(productId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המוצר?')) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete product');
        }

        // Remove from local arrays
        allProducts = allProducts.filter(p => p.id !== productId);
        filteredProducts = filteredProducts.filter(p => p.id !== productId);

        displayProducts(filteredProducts);
        showSuccess('המוצר נמחק בהצלחה!');

    } catch (error) {
        console.error('Error deleting product:', error);
        showError(`שגיאה במחיקת המוצר: ${error.message}`);
    }
}

function showLoading() {
    document.getElementById('productsGrid').innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>טוען מוצרים...</p>
        </div>
    `;
}

function showSuccess(message) {
    // Create a better notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-weight: 600;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function showError(message) {
    // Create a better error notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
        z-index: 10000;
        font-weight: 600;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
}
