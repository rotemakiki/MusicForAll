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
    const isAdmin = window.userRoles && window.userRoles.includes('admin');
    const editButton = isAdmin ?
        `<button class="edit-btn" onclick="editProduct('${product.id}')" title="ערוך מוצר">
            <i class="fas fa-edit"></i>
        </button>` : '';
    const deleteButton = isAdmin ?
        `<button class="delete-btn" onclick="deleteProduct('${product.id}')" title="מחק מוצר">
            <i class="fas fa-trash"></i>
        </button>` : '';

    // Create safe image URL with proper fallback
    const imageUrl = product.image || '/static/images/placeholder-product.jpg';

    // Price display - show ILS, convert to USD if needed
    let priceDisplay = '';
    if (product.price_ils) {
        priceDisplay = `<span class="product-price">${product.price_ils.toFixed(2)} ₪</span>`;
    } else if (product.price_usd) {
        const ilsPrice = (product.price_usd / 0.27).toFixed(2);
        priceDisplay = `<span class="product-price">${ilsPrice} ₪</span>`;
    } else if (product.price) {
        // Legacy support
        const ilsPrice = (product.price / 0.27).toFixed(2);
        priceDisplay = `<span class="product-price">${ilsPrice} ₪</span>`;
    }

    // Shipping info
    let shippingInfo = '';
    if (product.shipping_type === 'free') {
        shippingInfo = '<span class="shipping-badge free">שילוח חינם</span>';
    } else if (product.shipping_type === 'free_above_amount' && product.free_shipping_above) {
        shippingInfo = `<span class="shipping-badge conditional">חינם מעל ${product.free_shipping_above} ₪</span>`;
    } else if (product.shipping_type === 'paid' && product.shipping_cost) {
        shippingInfo = `<span class="shipping-badge paid">שילוח: ${product.shipping_cost} ₪</span>`;
    }

    // Category display
    const categoryDisplay = product.main_category || product.category || 'ללא קטגוריה';
    const subCategoryDisplay = product.sub_category ? `<span class="sub-category">${product.sub_category}</span>` : '';

    // Rating display
    const ratingDisplay = product.rating ? `
        <div class="product-rating">
            <span class="rating-stars">${generateStars(product.rating)}</span>
            <span class="rating-number">${product.rating.toFixed(1)}</span>
        </div>
    ` : '';

    return `
        <div class="product-card" data-category="${product.main_category || product.category || ''}" onclick="window.location.href='/products/${product.id}'">
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${product.name}" class="product-image"
                     onload="this.style.opacity='1'"
                     onerror="this.src='/static/images/placeholder-product.jpg'; this.style.opacity='1'"
                     style="opacity:0; transition: opacity 0.3s ease;">
                ${product.images && product.images.length > 0 ? `<span class="images-count">+${product.images.length} תמונות</span>` : ''}
                ${isAdmin ? `
                    <div class="product-admin-actions">
                        ${editButton}
                        ${deleteButton}
                    </div>
                ` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</p>

                <div class="product-meta">
                    ${ratingDisplay}
                    ${priceDisplay}
                    <div class="product-categories">
                        <span class="product-category">${categoryDisplay}</span>
                        ${subCategoryDisplay}
                    </div>
                </div>

                ${shippingInfo ? `<div class="product-shipping">${shippingInfo}</div>` : ''}

                <div class="product-actions">
                    <a href="/products/${product.id}" class="view-btn" onclick="event.stopPropagation()">
                        <i class="fas fa-eye"></i>
                        צפה בפרטים
                    </a>
                    <a href="${product.aliexpress_link || '#'}" target="_blank" class="aliexpress-btn" onclick="event.stopPropagation()">
                        <i class="fas fa-external-link-alt"></i>
                        קנה עכשיו
                    </a>
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
        filteredProducts = allProducts.filter(product => 
            (product.main_category && product.main_category === category) ||
            (product.category && product.category === category)
        );
    }

    // Apply search filter if exists
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            (product.main_category && product.main_category.toLowerCase().includes(searchTerm)) ||
            (product.sub_category && product.sub_category.toLowerCase().includes(searchTerm))
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
    const form = document.getElementById('addProductForm');
    form.reset();
    delete form.dataset.productId;
    delete form.dataset.isEdit;
    const submitBtn = form.querySelector('.submit-btn');
    if (submitBtn) submitBtn.textContent = 'הוסף מוצר';
}

function updateShippingFields() {
    const shippingType = document.getElementById('productShippingType').value;
    const shippingCostGroup = document.getElementById('shippingCostGroup');
    const freeShippingAboveGroup = document.getElementById('freeShippingAboveGroup');

    if (shippingCostGroup) shippingCostGroup.style.display = shippingType === 'paid' ? 'block' : 'none';
    if (freeShippingAboveGroup) freeShippingAboveGroup.style.display = shippingType === 'free_above_amount' ? 'block' : 'none';
}

async function addProduct(event) {
    event.preventDefault();

    // Parse images and videos
    const imagesText = document.getElementById('productImages')?.value || '';
    const images = imagesText ? imagesText.split(',').map(img => img.trim()).filter(img => img) : [];
    
    const videosText = document.getElementById('productVideos')?.value || '';
    const videos = videosText ? videosText.split(',').map(v => v.trim()).filter(v => v) : [];

    // Handle price
    const priceILS = document.getElementById('productPriceILS')?.value;
    const priceUSD = document.getElementById('productPriceUSD')?.value;
    
    // Get shipping info
    const shippingType = document.getElementById('productShippingType')?.value || 'free';
    const shippingCost = document.getElementById('productShippingCost')?.value;
    const freeShippingAbove = document.getElementById('productFreeShippingAbove')?.value;

    const formData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value,
        images: images,
        videos: videos,
        aliexpress_link: document.getElementById('productAliexpressLink').value,
        website_name: document.getElementById('productWebsiteName')?.value || 'AliExpress',
        main_category: document.getElementById('productMainCategory').value,
        sub_category: document.getElementById('productSubCategory')?.value || '',
        rating: document.getElementById('productRating')?.value ? parseFloat(document.getElementById('productRating').value) : null,
        shipping_type: shippingType
    };

    // Add price
    if (priceILS) {
        formData.price_ils = parseFloat(priceILS);
    } else if (priceUSD) {
        formData.price_usd = parseFloat(priceUSD);
    }

    // Add shipping details
    if (shippingType === 'paid' && shippingCost) {
        formData.shipping_cost = parseFloat(shippingCost);
    } else if (shippingType === 'free_above_amount' && freeShippingAbove) {
        formData.free_shipping_above = parseFloat(freeShippingAbove);
    }

    // Check if this is an update
    const form = document.getElementById('addProductForm');
    const isEdit = form.dataset.isEdit === 'true';
    const productId = form.dataset.productId;

    try {
        const url = isEdit ? `/api/products/${productId}` : '/api/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Failed to ${isEdit ? 'update' : 'add'} product`);
        }

        // Reload products
        await loadProducts();
        closeAddProductModal();
        showSuccess(`המוצר ${isEdit ? 'עודכן' : 'נוסף'} בהצלחה!`);

    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'adding'} product:`, error);
        showError(`שגיאה ב${isEdit ? 'עדכון' : 'הוספת'} המוצר: ${error.message}`);
    }
}

async function editProduct(productId) {
    event.stopPropagation();
    // Load product data and open edit modal
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('Failed to load product');
        
        const product = await response.json();
        
        // Populate form with product data
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productImage').value = product.image || '';
        document.getElementById('productAliexpressLink').value = product.aliexpress_link || '';
        if (document.getElementById('productWebsiteName')) {
            document.getElementById('productWebsiteName').value = product.website_name || 'AliExpress';
        }
        document.getElementById('productMainCategory').value = product.main_category || '';
        if (document.getElementById('productSubCategory')) {
            document.getElementById('productSubCategory').value = product.sub_category || '';
        }
        if (document.getElementById('productRating')) {
            document.getElementById('productRating').value = product.rating || '';
        }
        
        if (product.price_ils && document.getElementById('productPriceILS')) {
            document.getElementById('productPriceILS').value = product.price_ils;
        } else if (product.price_usd && document.getElementById('productPriceUSD')) {
            document.getElementById('productPriceUSD').value = product.price_usd;
        }
        
        if (document.getElementById('productShippingType')) {
            document.getElementById('productShippingType').value = product.shipping_type || 'free';
            updateShippingFields();
        }
        
        if (product.shipping_cost && document.getElementById('productShippingCost')) {
            document.getElementById('productShippingCost').value = product.shipping_cost;
        }
        if (product.free_shipping_above && document.getElementById('productFreeShippingAbove')) {
            document.getElementById('productFreeShippingAbove').value = product.free_shipping_above;
        }
        
        if (document.getElementById('productImages')) {
            document.getElementById('productImages').value = product.images ? product.images.join(', ') : '';
        }
        if (document.getElementById('productVideos')) {
            document.getElementById('productVideos').value = product.videos ? product.videos.join(', ') : '';
        }
        
        // Store product ID for update
        const form = document.getElementById('addProductForm');
        form.dataset.productId = productId;
        form.dataset.isEdit = 'true';
        
        // Change submit button text
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) submitBtn.textContent = 'עדכן מוצר';
        
        openAddProductModal();
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showError('שגיאה בטעינת המוצר לעריכה');
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
