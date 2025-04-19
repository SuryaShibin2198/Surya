export default {
  Start: '/',
  Test: '/test',
  Base: '/api',

  User: {
    Base: '/auth',
    register: '/register',
    login: '/login',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password/:token',
    logout: '/logout',
  },

  Category: {
    Base: '/category',
    add: '/',
    getAll: '/',
    getOne: '/:id',
    update: '/:id',
    delete: '/:id',
  },
  SubCategory: {
    Base: '/sub-category',
    add: '/',
    getAll: '/',
    getOne: '/:id',
    update: '/:id',
    delete: '/:id',
  },
  Product: {
    Base: '/product',
    add: '/',
    getAll: '/',
    getOne: '/:id',
    update: '/:id',
    delete: '/:id',
  },
  Wishlist: {
    Base: '/wishlist',
    add: '/',
    getAll: '/',
    remove: '/:id',
  },
  Cart: {
    Base: '/cart',
    addToCart: '/',
    getCartItems: '/',
    removeCartItem: '/:productId',
    updateCartQuantity: '/update-quantity',
  },
  Order: {
    Base: '/order',
    placeOrder: '/',
    cancelOrder: '/:id',
    getAll: '/',
    getOne: '/:id',
    pushNotification: '/pushnotification'
  },
  Coupon: {
    Base: '/coupon',
    add: '/',
    getAll: '/',
  },
  Pincode: {
    Base: '/pincode',
    add: '/',
    getAll: '/',
    getOne: '/:id',
    update: '/:id',
    delete: '/:id',
  },
  Offer: {
    Base: '/offer',
    add: '/',
    getAll: '/',
    getOne: '/:id',
    update: '/:id',
    delete: '/:id',
  },

} as const;
