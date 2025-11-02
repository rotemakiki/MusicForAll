// Product Detail Page JavaScript
let currentProduct = null;
let selectedRating = 0;

document.addEventListener('DOMContentLoaded', function() {
    loadProduct();
    setupStarRating();
});

async function loadProduct() {
    try {
        const response = await fetch(`/api/products/${window.productId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load product');
        }

        currentProduct = await response.json();
        displayProduct(currentProduct);
        loadReviews();

        // Hide loading, show content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('productContent').style.display = 'block';

    } catch (error) {
        console.error('Error loading product:', error);
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
    }
}

function displayProduct(product) {
    // Set page title
    document.title = `${product.name} - מוצר למוזיקאים`;

    // Header
    document.getElementById('productName').textContent = product.name;
    
    // Category
    const categoryBadge = document.getElementById('productCategory');
    categoryBadge.textContent = product.main_category || product.category || '';
    if (product.sub_category) {
        categoryBadge.textContent += ` - ${product.sub_category}`;
    }

    // Rating
    if (product.rating) {
        document.getElementById('productRating').innerHTML = `
            <span class="rating-stars">${generateStars(product.rating)}</span>
            <span class="rating-number">${product.rating.toFixed(1)}</span>
        `;
    } else {
        document.getElementById('productRating').textContent = 'אין דירוג';
    }

    // Price
    let priceILS = product.price_ils;
    let priceUSD = product.price_usd;

    if (!priceILS && product.price_usd) {
        priceILS = (product.price_usd / 0.27).toFixed(2);
    } else if (!priceUSD && product.price_ils) {
        priceUSD = (product.price_ils * 0.27).toFixed(2);
    } else if (product.price) {
        // Legacy support
        priceILS = (product.price / 0.27).toFixed(2);
        priceUSD = product.price.toFixed(2);
    }

    if (priceILS) {
        document.getElementById('productPriceILS').textContent = `${parseFloat(priceILS).toFixed(2)} ₪`;
    }
    if (priceUSD) {
        document.getElementById('productPriceUSD').textContent = `(~${parseFloat(priceUSD).toFixed(2)} USD)`;
    }

    // Shipping info
    const shippingInfo = document.getElementById('shippingInfo');
    if (product.shipping_type === 'free') {
        shippingInfo.innerHTML = '<span class="shipping-badge free">🆓 שילוח חינם</span>';
    } else if (product.shipping_type === 'free_above_amount' && product.free_shipping_above) {
        shippingInfo.innerHTML = `<span class="shipping-badge conditional">🆓 שילוח חינם מעל ${product.free_shipping_above} ₪</span>`;
    } else if (product.shipping_type === 'paid' && product.shipping_cost) {
        shippingInfo.innerHTML = `<span class="shipping-badge paid">💸 שילוח: ${product.shipping_cost} ₪</span>`;
    } else {
        shippingInfo.innerHTML = '';
    }

    // Description
    document.getElementById('productDescription').textContent = product.description || 'אין תיאור';

    // Website
    document.getElementById('productWebsite').textContent = product.website_name || 'AliExpress';

    // Buy button
    const buyButton = document.getElementById('buyButton');
    if (product.aliexpress_link) {
        buyButton.href = product.aliexpress_link;
        buyButton.textContent = `קנה ב${product.website_name || 'AliExpress'}`;
    }

    // Images
    displayImages(product);

    // Videos
    if (product.videos && product.videos.length > 0) {
        displayVideos(product.videos);
    }
}

function displayImages(product) {
    const mainImage = document.getElementById('mainProductImage');
    const gallery = document.getElementById('imageGallery');
    
    const allImages = [product.image, ...(product.images || [])].filter(img => img);

    if (allImages.length === 0) {
        mainImage.src = '/static/images/placeholder-product.jpg';
        return;
    }

    // Set main image
    mainImage.src = allImages[0];
    mainImage.alt = product.name;

    // Create thumbnails
    if (allImages.length > 1) {
        gallery.innerHTML = allImages.map((img, index) => `
            <img src="${img}" alt="${product.name} - תמונה ${index + 1}" 
                 class="gallery-thumbnail ${index === 0 ? 'active' : ''}"
                 onclick="changeMainImage('${img}', ${index})">
        `).join('');
    } else {
        gallery.innerHTML = '';
    }
}

function changeMainImage(imageUrl, index) {
    document.getElementById('mainProductImage').src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('.gallery-thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function displayVideos(videos) {
    const videoSection = document.getElementById('videoSection');
    const videosGrid = document.getElementById('productVideos');
    
    videoSection.style.display = 'block';
    
    videosGrid.innerHTML = videos.map(videoUrl => {
        // Try to detect YouTube/Vimeo URLs and convert to embed
        let embedUrl = videoUrl;
        
        // YouTube
        if (videoUrl.includes('youtube.com/watch?v=')) {
            const videoId = videoUrl.split('v=')[1].split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes('youtu.be/')) {
            const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        // Vimeo
        else if (videoUrl.includes('vimeo.com/')) {
            const videoId = videoUrl.split('vimeo.com/')[1].split('?')[0];
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }

        if (embedUrl.includes('youtube.com/embed') || embedUrl.includes('vimeo.com/video')) {
            return `
                <div class="video-embed">
                    <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        } else {
            return `
                <div class="video-link">
                    <a href="${videoUrl}" target="_blank" class="video-url-btn">
                        <i class="fas fa-video"></i> צפה בסרטון
                    </a>
                </div>
            `;
        }
    }).join('');
}

async function loadReviews() {
    try {
        const response = await fetch(`/api/products/${window.productId}/reviews`);
        
        if (!response.ok) {
            throw new Error('Failed to load reviews');
        }

        const reviews = await response.json();
        displayReviews(reviews);

    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsList').innerHTML = '<p>שגיאה בטעינת התגובות</p>';
    }
}

function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsCount = document.getElementById('reviewsCount');
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<p class="no-reviews">אין תגובות עדיין. היה הראשון להוסיף תגובה!</p>';
        reviewsCount.textContent = '(0 תגובות)';
        document.getElementById('averageRating').textContent = '';
        return;
    }

    // Calculate average rating
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    document.getElementById('averageRating').innerHTML = `
        <span class="rating-stars">${generateStars(averageRating)}</span>
        <span class="rating-number">${averageRating.toFixed(1)}</span>
    `;
    reviewsCount.textContent = `(${reviews.length} תגובות)`;

    // Display reviews
    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <div class="reviewer-info">
                    ${review.user_profile_image ? 
                        `<img src="${review.user_profile_image}" alt="${review.username}" class="reviewer-avatar">` : 
                        `<div class="reviewer-avatar-placeholder">${(review.username || 'א')[0]}</div>`
                    }
                    <div class="reviewer-details">
                        <strong class="reviewer-name">${review.username || 'אנונימי'}</strong>
                        <span class="review-date">${formatDate(review.created_at)}</span>
                    </div>
                </div>
                <div class="review-rating-display">
                    ${generateStars(review.rating)}
                    <span class="rating-number">${review.rating.toFixed(1)}</span>
                </div>
            </div>
            <div class="review-content">
                <p>${review.comment}</p>
                ${review.video_url ? `
                    <div class="review-video">
                        <a href="${review.video_url}" target="_blank" class="review-video-link">
                            <i class="fas fa-video"></i> צפה בסרטון ביקורת
                        </a>
                    </div>
                ` : ''}
            </div>
            ${(window.userId === review.user_id || (window.userRoles && window.userRoles.includes('admin'))) ? `
                <button onclick="deleteReview('${review.id}')" class="delete-review-btn">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

function setupStarRating() {
    const stars = document.querySelectorAll('#reviewStarRating i');
    
    stars.forEach(star => {
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
        
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            highlightStars(selectedRating);
            document.getElementById('selectedRatingText').textContent = selectedRating;
        });
    });
    
    document.getElementById('reviewStarRating').addEventListener('mouseleave', function() {
        highlightStars(selectedRating);
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#reviewStarRating i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star';
        } else {
            star.className = 'far fa-star';
        }
    });
}

async function submitReview() {
    if (!window.userId) {
        alert('אנא התחבר כדי להוסיף תגובה');
        return;
    }

    if (selectedRating === 0) {
        alert('אנא בחר דירוג');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        alert('אנא כתוב תגובה');
        return;
    }

    const reviewData = {
        rating: selectedRating,
        comment: comment
    };

    const videoUrl = document.getElementById('reviewVideoUrl').value.trim();
    if (videoUrl) {
        reviewData.video_url = videoUrl;
    }

    try {
        const response = await fetch(`/api/products/${window.productId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reviewData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to submit review');
        }

        // Reset form
        selectedRating = 0;
        highlightStars(0);
        document.getElementById('selectedRatingText').textContent = '0';
        document.getElementById('reviewComment').value = '';
        document.getElementById('reviewVideoUrl').value = '';

        // Reload reviews
        loadReviews();
        
        showNotification('התגובה נוספה בהצלחה!', 'success');

    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification(`שגיאה בשליחת התגובה: ${error.message}`, 'error');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${window.productId}/reviews/${reviewId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to delete review');
        }

        loadReviews();
        showNotification('התגובה נמחקה בהצלחה!', 'success');

    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification(`שגיאה במחיקת התגובה: ${error.message}`, 'error');
    }
}

function shareProduct() {
    if (navigator.share) {
        navigator.share({
            title: currentProduct.name,
            text: currentProduct.description,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('הקישור הועתק ללוח!', 'success');
        });
    }
}

function editProductFromDetail() {
    window.location.href = `/products?edit=${window.productId}`;
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

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'לפני רגע';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    
    return date.toLocaleDateString('he-IL');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #28a745, #20c997)' : 'linear-gradient(135deg, #dc3545, #c82333)'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
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

