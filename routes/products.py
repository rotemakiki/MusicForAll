from flask import Blueprint, render_template, request, jsonify, session, flash, redirect, url_for
from firebase_admin import firestore
from datetime import datetime

products_bp = Blueprint('products', __name__)

# Exchange rate for ILS to USD (can be updated dynamically)
ILS_TO_USD_RATE = 0.27  # Approximate rate, should be updated from API

@products_bp.route('/products')
def products_page():
    """עמוד המוצרים הראשי"""
    return render_template('products.html')

@products_bp.route('/products/<string:product_id>')
def product_detail_page(product_id):
    """עמוד פרטי מוצר"""
    return render_template('product_detail.html', product_id=product_id)

@products_bp.route('/api/products', methods=['GET'])
def get_products():
    """API לקבלת כל המוצרים"""
    try:
        db = firestore.client()
        products_ref = db.collection('products').order_by('created_at', direction=firestore.Query.DESCENDING)
        products = []

        for doc in products_ref.stream():
            product_data = doc.to_dict()
            product_data['id'] = doc.id
            products.append(product_data)

        return jsonify(products), 200

    except Exception as e:
        print(f"Error fetching products: {e}")
        return jsonify({"error": "Failed to fetch products"}), 500

@products_bp.route('/api/products', methods=['POST'])
def add_product():
    """API להוספת מוצר חדש - רק למנהלים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Unauthorized - admin access required"}), 403

    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'description', 'image', 'aliexpress_link', 'main_category']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate main category
        valid_main_categories = ['תופים', 'קלידים', 'גיטרות', 'כלי נשיפה', 'ציוד אודיו', 'אביזרים']
        if data['main_category'] not in valid_main_categories:
            return jsonify({"error": "Invalid main category"}), 400

        # Prepare product data
        product_data = {
            'name': data['name'].strip(),
            'description': data['description'].strip(),
            'image': data['image'].strip(),  # Main image
            'images': data.get('images', []) if isinstance(data.get('images'), list) else [],  # Multiple images
            'videos': data.get('videos', []) if isinstance(data.get('videos'), list) else [],  # Video URLs
            'aliexpress_link': data['aliexpress_link'].strip(),
            'website_name': data.get('website_name', 'AliExpress').strip(),  # Website name
            'main_category': data['main_category'],
            'sub_category': data.get('sub_category', '').strip(),
            'rating': float(data.get('rating', 0)) if data.get('rating') else None,
            'created_by': session['user_id'],
            'created_at': datetime.utcnow()
        }

        # Handle price in ILS/USD
        if 'price_ils' in data and data['price_ils'] is not None:
            try:
                price_ils = float(data['price_ils'])
                if price_ils >= 0:
                    product_data['price_ils'] = price_ils
                    product_data['price_usd'] = round(price_ils * ILS_TO_USD_RATE, 2)
            except (ValueError, TypeError):
                pass
        elif 'price_usd' in data and data['price_usd'] is not None:
            try:
                price_usd = float(data['price_usd'])
                if price_usd >= 0:
                    product_data['price_usd'] = price_usd
                    product_data['price_ils'] = round(price_usd / ILS_TO_USD_RATE, 2)
            except (ValueError, TypeError):
                pass

        # Handle shipping
        shipping_type = data.get('shipping_type', 'paid')
        product_data['shipping_type'] = shipping_type
        if shipping_type == 'free_above_amount':
            try:
                product_data['free_shipping_above'] = float(data.get('free_shipping_above', 0))
            except (ValueError, TypeError):
                product_data['free_shipping_above'] = 0
        elif shipping_type == 'paid':
            try:
                product_data['shipping_cost'] = float(data.get('shipping_cost', 0))
            except (ValueError, TypeError):
                product_data['shipping_cost'] = 0

        # Save to database
        db = firestore.client()
        doc_ref = db.collection('products').add(product_data)

        return jsonify({"message": "Product added successfully", "id": doc_ref[1].id}), 201

    except Exception as e:
        print(f"Error adding product: {e}")
        return jsonify({"error": "Failed to add product"}), 500

@products_bp.route('/api/products/<string:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """API למחיקת מוצר - רק למנהלים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Unauthorized - admin access required"}), 403

    try:
        db = firestore.client()

        # Check if product exists
        product_doc = db.collection('products').document(product_id).get()
        if not product_doc.exists:
            return jsonify({"error": "Product not found"}), 404

        # Delete the product
        db.collection('products').document(product_id).delete()

        return jsonify({"message": "Product deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting product: {e}")
        return jsonify({"error": "Failed to delete product"}), 500

@products_bp.route('/api/products/<string:product_id>', methods=['PUT'])
def update_product(product_id):
    """API לעדכון מוצר - רק למנהלים"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Unauthorized - admin access required"}), 403

    try:
        db = firestore.client()

        # Check if product exists
        product_doc = db.collection('products').document(product_id).get()
        if not product_doc.exists:
            return jsonify({"error": "Product not found"}), 404

        data = request.get_json()
        update_data = {}

        # Handle rating
        if 'rating' in data:
            try:
                rating = float(data['rating'])
                if rating < 1 or rating > 5:
                    return jsonify({"error": "Rating must be between 1 and 5"}), 400
                update_data['rating'] = rating
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid rating format"}), 400

        # Handle main category
        if 'main_category' in data:
            valid_main_categories = ['תופים', 'קלידים', 'גיטרות', 'כלי נשיפה', 'ציוד אודיו', 'אביזרים']
            if data['main_category'] not in valid_main_categories:
                return jsonify({"error": "Invalid main category"}), 400
            update_data['main_category'] = data['main_category']

        # Handle price updates
        if 'price_ils' in data and data['price_ils'] is not None:
            try:
                price_ils = float(data['price_ils'])
                if price_ils >= 0:
                    update_data['price_ils'] = price_ils
                    update_data['price_usd'] = round(price_ils * ILS_TO_USD_RATE, 2)
            except (ValueError, TypeError):
                pass
        elif 'price_usd' in data and data['price_usd'] is not None:
            try:
                price_usd = float(data['price_usd'])
                if price_usd >= 0:
                    update_data['price_usd'] = price_usd
                    update_data['price_ils'] = round(price_usd / ILS_TO_USD_RATE, 2)
            except (ValueError, TypeError):
                pass

        # Handle shipping updates
        if 'shipping_type' in data:
            update_data['shipping_type'] = data['shipping_type']
            if data['shipping_type'] == 'free_above_amount':
                try:
                    update_data['free_shipping_above'] = float(data.get('free_shipping_above', 0))
                except (ValueError, TypeError):
                    update_data['free_shipping_above'] = 0
            elif data['shipping_type'] == 'paid':
                try:
                    update_data['shipping_cost'] = float(data.get('shipping_cost', 0))
                except (ValueError, TypeError):
                    update_data['shipping_cost'] = 0

        # Handle other fields
        allowed_fields = ['name', 'description', 'image', 'images', 'videos', 'aliexpress_link', 
                         'website_name', 'sub_category']
        for field in allowed_fields:
            if field in data:
                if field in ['images', 'videos'] and isinstance(data[field], list):
                    update_data[field] = data[field]
                elif isinstance(data[field], str):
                    update_data[field] = data[field].strip()

        # Add update timestamp
        update_data['updated_at'] = datetime.utcnow()
        update_data['updated_by'] = session['user_id']

        # Update the product
        db.collection('products').document(product_id).update(update_data)

        return jsonify({"message": "Product updated successfully"}), 200

    except Exception as e:
        print(f"Error updating product: {e}")
        return jsonify({"error": "Failed to update product"}), 500

@products_bp.route('/api/products/<string:product_id>', methods=['GET'])
def get_single_product(product_id):
    """API לקבלת מוצר בודד"""
    try:
        db = firestore.client()
        product_doc = db.collection('products').document(product_id).get()

        if not product_doc.exists:
            return jsonify({"error": "Product not found"}), 404

        product_data = product_doc.to_dict()
        product_data['id'] = product_doc.id

        return jsonify(product_data), 200

    except Exception as e:
        print(f"Error fetching product: {e}")
        return jsonify({"error": "Failed to fetch product"}), 500

@products_bp.route('/api/products/category/<string:category>', methods=['GET'])
def get_products_by_category(category):
    """API לקבלת מוצרים לפי קטגוריה ראשית"""
    try:
        valid_categories = ['תופים', 'קלידים', 'גיטרות', 'כלי נשיפה', 'ציוד אודיו', 'אביזרים']
        if category not in valid_categories:
            return jsonify({"error": "Invalid category"}), 400

        db = firestore.client()
        products_ref = db.collection('products').where('main_category', '==', category).order_by('created_at', direction=firestore.Query.DESCENDING)
        products = []

        for doc in products_ref.stream():
            product_data = doc.to_dict()
            product_data['id'] = doc.id
            products.append(product_data)

        return jsonify(products), 200

    except Exception as e:
        print(f"Error fetching products by category: {e}")
        return jsonify({"error": "Failed to fetch products"}), 500

@products_bp.route('/api/products/<string:product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    """API לקבלת תגובות על מוצר"""
    try:
        db = firestore.client()
        reviews_ref = db.collection('product_reviews').where('product_id', '==', product_id).order_by('created_at', direction=firestore.Query.DESCENDING)
        reviews = []

        for doc in reviews_ref.stream():
            review_data = doc.to_dict()
            review_data['id'] = doc.id
            # Don't expose user password or sensitive data
            if 'user_id' in review_data:
                user_doc = db.collection('users').document(review_data['user_id']).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    review_data['username'] = user_data.get('username', 'אנונימי')
                    review_data['user_profile_image'] = user_data.get('profile_image', '')
            reviews.append(review_data)

        return jsonify(reviews), 200

    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return jsonify({"error": "Failed to fetch reviews"}), 500

@products_bp.route('/api/products/<string:product_id>/reviews', methods=['POST'])
def add_product_review(product_id):
    """API להוספת תגובה על מוצר"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        data = request.get_json()

        # Validate required fields
        if 'rating' not in data or 'comment' not in data:
            return jsonify({"error": "Missing required fields: rating and comment"}), 400

        # Validate rating
        try:
            rating = float(data['rating'])
            if rating < 1 or rating > 5:
                return jsonify({"error": "Rating must be between 1 and 5"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid rating format"}), 400

        # Check if product exists
        db = firestore.client()
        product_doc = db.collection('products').document(product_id).get()
        if not product_doc.exists:
            return jsonify({"error": "Product not found"}), 404

        # Create review
        review_data = {
            'product_id': product_id,
            'user_id': session['user_id'],
            'rating': rating,
            'comment': data['comment'].strip(),
            'created_at': datetime.utcnow()
        }

        # Add optional video URL for review video
        if 'video_url' in data and data['video_url']:
            review_data['video_url'] = data['video_url'].strip()

        # Save review
        review_ref = db.collection('product_reviews').add(review_data)

        return jsonify({"message": "Review added successfully", "id": review_ref[1].id}), 201

    except Exception as e:
        print(f"Error adding review: {e}")
        return jsonify({"error": "Failed to add review"}), 500

@products_bp.route('/api/products/<string:product_id>/reviews/<string:review_id>', methods=['DELETE'])
def delete_product_review(product_id, review_id):
    """API למחיקת תגובה - רק המחבר או אדמין"""
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized - please login"}), 401

    try:
        db = firestore.client()

        # Check if review exists
        review_doc = db.collection('product_reviews').document(review_id).get()
        if not review_doc.exists:
            return jsonify({"error": "Review not found"}), 404

        review_data = review_doc.to_dict()

        # Check if user is owner or admin
        user_roles = session.get('roles', [])
        if review_data['user_id'] != session['user_id'] and 'admin' not in user_roles:
            return jsonify({"error": "Unauthorized - you can only delete your own reviews"}), 403

        # Delete review
        db.collection('product_reviews').document(review_id).delete()

        return jsonify({"message": "Review deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting review: {e}")
        return jsonify({"error": "Failed to delete review"}), 500
