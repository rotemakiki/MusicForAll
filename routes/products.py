from flask import Blueprint, render_template, request, jsonify, session, flash, redirect, url_for
from firebase_admin import firestore
from datetime import datetime

products_bp = Blueprint('products', __name__)

@products_bp.route('/products')
def products_page():
    """עמוד המוצרים הראשי"""
    return render_template('products.html')

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
        required_fields = ['name', 'description', 'image', 'aliexpress_link', 'category', 'rating']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate rating
        try:
            rating = float(data['rating'])
            if rating < 1 or rating > 5:
                return jsonify({"error": "Rating must be between 1 and 5"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid rating format"}), 400

        # Validate category
        valid_categories = ['instruments', 'accessories', 'audio']
        if data['category'] not in valid_categories:
            return jsonify({"error": "Invalid category"}), 400

        # Prepare product data
        product_data = {
            'name': data['name'].strip(),
            'description': data['description'].strip(),
            'image': data['image'].strip(),
            'aliexpress_link': data['aliexpress_link'].strip(),
            'category': data['category'],
            'rating': rating,
            'created_by': session['user_id'],
            'created_at': datetime.utcnow()
        }

        # Add optional price
        if 'price' in data and data['price'] is not None:
            try:
                price = float(data['price'])
                if price >= 0:
                    product_data['price'] = price
            except (ValueError, TypeError):
                pass

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

        # Validate rating if provided
        if 'rating' in data:
            try:
                rating = float(data['rating'])
                if rating < 1 or rating > 5:
                    return jsonify({"error": "Rating must be between 1 and 5"}), 400
                data['rating'] = rating
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid rating format"}), 400

        # Validate category if provided
        if 'category' in data:
            valid_categories = ['instruments', 'accessories', 'audio']
            if data['category'] not in valid_categories:
                return jsonify({"error": "Invalid category"}), 400

        # Validate price if provided
        if 'price' in data and data['price'] is not None:
            try:
                price = float(data['price'])
                if price < 0:
                    return jsonify({"error": "Price cannot be negative"}), 400
                data['price'] = price
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid price format"}), 400

        # Add update timestamp
        data['updated_at'] = datetime.utcnow()
        data['updated_by'] = session['user_id']

        # Update the product
        db.collection('products').document(product_id).update(data)

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
    """API לקבלת מוצרים לפי קטגוריה"""
    try:
        valid_categories = ['instruments', 'accessories', 'audio']
        if category not in valid_categories:
            return jsonify({"error": "Invalid category"}), 400

        db = firestore.client()
        products_ref = db.collection('products').where('category', '==', category).order_by('created_at', direction=firestore.Query.DESCENDING)
        products = []

        for doc in products_ref.stream():
            product_data = doc.to_dict()
            product_data['id'] = doc.id
            products.append(product_data)

        return jsonify(products), 200

    except Exception as e:
        print(f"Error fetching products by category: {e}")
        return jsonify({"error": "Failed to fetch products"}), 500
