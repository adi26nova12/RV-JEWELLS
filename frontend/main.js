/* ==========================================================================
   RV JEWELLS — INTERACTIVE LOGIC & ANIMATIONS (GSAP)
   ========================================================================== */

// --- Product Database ---
const PRODUCTS = [
  {
    id: "necklace-aura",
    name: "Aura Pendant Necklace",
    price: 12499.00,
    oldPrice: 16499.00,
    category: "necklaces",
    image: "assets/product_necklace.png",
    description: "A delicate, shimmering gold chain featuring a circular halo pendant. Designed to sit elegantly on the collarbone, it is the perfect minimal centerpiece for layered styling. Plated in dense 18K gold over waterproof stainless steel.",
    badge: "Best Seller"
  },
  {
    id: "ring-solitaire",
    name: "Solitaire Gold Ring",
    price: 15999.00,
    oldPrice: null,
    category: "rings",
    image: "assets/product_ring.png",
    description: "A premium solitaire band featuring a single, brilliant round-cut cubic zirconia stone set in six fine prongs. Crafted for structural strength and timeless luxury, perfect for stacking or standalone wear.",
    badge: "Trending"
  },
  {
    id: "earrings-hoop",
    name: "Eternal Hoop Earrings",
    price: 10999.00,
    oldPrice: 13999.00,
    category: "earrings",
    image: "assets/product_hoops.png",
    description: "Classic, thick gold hoop earrings with an ultra-polished mirror finish. Featuring a secure click-closure, these lightweight hoops are hypoallergenic and waterproof, ideal for day-to-night styling.",
    badge: "Essential"
  },
  {
    id: "bracelet-emerald",
    name: "Verdant Emerald Bracelet",
    price: 17999.00,
    oldPrice: null,
    category: "bracelets",
    image: "assets/product_bracelet.png",
    description: "A sleek link bracelet featuring a stunning square-cut emerald green gemstone centerpiece. Evoking vintage sophistication, this piece adds a subtle pop of elegant color to any attire.",
    badge: "Limited"
  },
  {
    id: "earrings-stars",
    name: "Celestial Drop Earrings",
    price: 13499.00,
    oldPrice: 18499.00,
    category: "earrings",
    image: "assets/product_stars.png",
    description: "Delicate gold star-shaped drop earrings hanging from dainty studs. Adorned with micro-pave sparkles, these lightweight drops capture the light beautifully with every turn of the head.",
    badge: "New"
  },
  {
    id: "necklace-herringbone",
    name: "Luxe Herringbone Chain",
    price: 19499.00,
    oldPrice: null,
    category: "necklaces",
    image: "assets/product_herringbone.png",
    description: "A bold, fluid flat herringbone chain coiled for maximum reflection. Made with surgical-grade steel and thick 18K plating, this chain sits flat against the skin for a smooth, high-fashion editorial look.",
    badge: "Exclusive"
  }
];

// Format price in Indian Rupee format (INR)
function formatINR(price) {
  return "₹" + price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Application State ---
let state = {
  cart: [],
  wishlist: [],
  activeQuickViewProductId: null
};

// --- DOM References ---
const bestSellersGrid = document.getElementById("best-sellers-grid");
const newArrivalsGrid = document.getElementById("new-arrivals-grid");

// Drawers & Modals
const drawerBackdrop = document.getElementById("drawer-backdrop");
const cartDrawer = document.getElementById("cart-drawer");
const wishlistDrawer = document.getElementById("wishlist-drawer");
const modalBackdrop = document.getElementById("modal-backdrop");
const quickViewModal = document.getElementById("quick-view-modal");

// Drawer Content
const cartItemsContainer = document.getElementById("cart-items-container");
const cartEmptyState = document.getElementById("cart-empty-state");
const cartFooter = document.getElementById("cart-footer");
const cartSubtotal = document.getElementById("cart-subtotal");
const cartBadge = document.getElementById("cart-badge");

const wishlistItemsContainer = document.getElementById("wishlist-items-container");
const wishlistEmptyState = document.getElementById("wishlist-empty-state");
const wishlistBadge = document.getElementById("wishlist-badge");

// Quick View Elements
const modalImg = document.getElementById("modal-img");
const modalCategory = document.getElementById("modal-category");
const modalTitle = document.getElementById("modal-title");
const modalPrice = document.getElementById("modal-price");
const modalOldPrice = document.getElementById("modal-old-price");
const modalDesc = document.getElementById("modal-desc");
const modalAddToCartBtn = document.getElementById("modal-add-to-cart-btn");
const modalWishlistToggleBtn = document.getElementById("modal-wishlist-toggle-btn");

// ==========================================================================
// RENDERING FUNCTIONS
// ==========================================================================

// Create HTML markup for a product card
function createProductCardHTML(product) {
  const isWishlisted = state.wishlist.includes(product.id);
  const badgeHTML = product.badge ? `<span class="product-badge">${product.badge}</span>` : '';
  const oldPriceHTML = product.oldPrice ? `<span class="product-old-price">${formatINR(product.oldPrice)}</span>` : '';
  
  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-img-wrapper">
        ${badgeHTML}
        <img src="${product.image}" alt="${product.name}">
        <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" aria-label="Toggle Wishlist" data-action="wishlist">
          <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
        <button class="quick-view-overlay-btn" data-action="quickview">Quick View</button>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-price-wrapper">
          <span class="product-price">${formatINR(product.price)}</span>
          ${oldPriceHTML}
        </div>
      </div>
    </div>
  `;
}

// Render Products to respective grids
function renderProducts() {
  // Best Sellers (first 4 products)
  const bestSellers = PRODUCTS.slice(0, 4);
  bestSellersGrid.innerHTML = bestSellers.map(createProductCardHTML).join('');

  // New Arrivals (remaining products)
  const newArrivals = PRODUCTS.slice(4);
  newArrivalsGrid.innerHTML = newArrivals.map(createProductCardHTML).join('');

  attachProductCardListeners();
}

// Attach event listeners to product card actions
function attachProductCardListeners() {
  document.querySelectorAll(".product-card").forEach(card => {
    const productId = card.getAttribute("data-id");

    // Wishlist Toggle button
    card.querySelector('[data-action="wishlist"]').addEventListener("click", (e) => {
      e.stopPropagation();
      toggleWishlist(productId);
    });

    // Quick View Overlay button
    card.querySelector('[data-action="quickview"]').addEventListener("click", (e) => {
      e.stopPropagation();
      openQuickView(productId);
    });

    // Image wrapper click also opens quick view (convenient for mobile taps)
    card.querySelector(".product-img-wrapper").addEventListener("click", (e) => {
      if (e.target.closest('[data-action="wishlist"]')) return;
      openQuickView(productId);
    });
  });
}

// Update Shopping Cart Drawer UI
function updateCartUI() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  cartBadge.innerText = count;

  if (state.cart.length === 0) {
    cartEmptyState.style.display = "flex";
    cartItemsContainer.style.display = "none";
    cartFooter.style.display = "none";
  } else {
    cartEmptyState.style.display = "none";
    cartItemsContainer.style.display = "flex";
    cartFooter.style.display = "flex";

    let total = 0;
    cartItemsContainer.innerHTML = state.cart.map(item => {
      const prod = PRODUCTS.find(p => p.id === item.productId);
      if (!prod) return '';
      
      const itemTotal = prod.price * item.qty;
      total += itemTotal;

      return `
        <div class="drawer-item" data-id="${prod.id}">
          <div class="drawer-item-img">
            <img src="${prod.image}" alt="${prod.name}">
          </div>
          <div class="drawer-item-details">
            <h4 class="drawer-item-name">${prod.name}</h4>
            <span class="drawer-item-price">${formatINR(prod.price)}</span>
            
            <div class="qty-selector">
              <button class="qty-btn" data-qty-action="decrease">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn" data-qty-action="increase">+</button>
            </div>
          </div>
          <button class="drawer-item-remove-btn" data-qty-action="remove" aria-label="Remove item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join('');

    cartSubtotal.innerText = formatINR(total);
    attachCartItemListeners();
  }
}

// Attach event listeners to items inside the Cart drawer
function attachCartItemListeners() {
  cartItemsContainer.querySelectorAll(".drawer-item").forEach(item => {
    const productId = item.getAttribute("data-id");

    // Decrease Qty
    item.querySelector('[data-qty-action="decrease"]').addEventListener("click", () => {
      updateCartQuantity(productId, -1);
    });

    // Increase Qty
    item.querySelector('[data-qty-action="increase"]').addEventListener("click", () => {
      updateCartQuantity(productId, 1);
    });

    // Remove item completely
    item.querySelector('[data-qty-action="remove"]').addEventListener("click", () => {
      removeFromCart(productId);
    });
  });
}

// Update Wishlist Drawer UI
function updateWishlistUI() {
  wishlistBadge.innerText = state.wishlist.length;

  if (state.wishlist.length === 0) {
    wishlistEmptyState.style.display = "flex";
    wishlistItemsContainer.style.display = "none";
  } else {
    wishlistEmptyState.style.display = "none";
    wishlistItemsContainer.style.display = "flex";

    wishlistItemsContainer.innerHTML = state.wishlist.map(productId => {
      const prod = PRODUCTS.find(p => p.id === productId);
      if (!prod) return '';

      return `
        <div class="drawer-item" data-id="${prod.id}">
          <div class="drawer-item-img">
            <img src="${prod.image}" alt="${prod.name}">
          </div>
          <div class="drawer-item-details">
            <h4 class="drawer-item-name">${prod.name}</h4>
            <span class="drawer-item-price">${formatINR(prod.price)}</span>
            <button class="btn-link" style="font-size: 0.7rem; margin-top: 0.5rem;" data-wishlist-action="addtocart">
              Move to Cart <i class="fa-solid fa-cart-shopping"></i>
            </button>
          </div>
          <button class="drawer-item-remove-btn" data-wishlist-action="remove" aria-label="Remove item">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
    }).join('');

    attachWishlistItemListeners();
  }
}

// Attach event listeners to items inside the Wishlist drawer
function attachWishlistItemListeners() {
  wishlistItemsContainer.querySelectorAll(".drawer-item").forEach(item => {
    const productId = item.getAttribute("data-id");

    // Move to cart
    item.querySelector('[data-wishlist-action="addtocart"]').addEventListener("click", () => {
      addToCart(productId);
      toggleWishlist(productId); // Remove from wishlist when moving to cart
      openDrawer("cart");
    });

    // Remove from wishlist
    item.querySelector('[data-wishlist-action="remove"]').addEventListener("click", () => {
      toggleWishlist(productId);
    });
  });
}

// ==========================================================================
// STATE MUTATION FUNCTIONS
// ==========================================================================

// Add a product to cart state
function addToCart(productId, qty = 1) {
  const existingItemIndex = state.cart.findIndex(item => item.productId === productId);

  if (existingItemIndex > -1) {
    state.cart[existingItemIndex].qty += qty;
  } else {
    state.cart.push({ productId, qty });
  }

  updateCartUI();
  
  // Custom bounce micro-animation on shopping cart icon
  const cartIcon = document.querySelector("#cart-trigger-btn i");
  gsap.fromTo(cartIcon, { scale: 0.8 }, { scale: 1.3, duration: 0.2, yoyo: true, repeat: 1 });
}

// Update the quantity of a product in the cart
function updateCartQuantity(productId, change) {
  const itemIndex = state.cart.findIndex(item => item.productId === productId);
  if (itemIndex > -1) {
    state.cart[itemIndex].qty += change;
    
    if (state.cart[itemIndex].qty <= 0) {
      state.cart.splice(itemIndex, 1);
    }
    
    updateCartUI();
  }
}

// Remove product from cart state
function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.productId !== productId);
  updateCartUI();
}

// Toggle Wishlist status
function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  let active = false;

  if (index > -1) {
    state.wishlist.splice(index, 1);
  } else {
    state.wishlist.push(productId);
    active = true;
    
    // Wishlist bounce micro-animation
    const wishlistIcon = document.querySelector("#wishlist-trigger-btn i");
    gsap.fromTo(wishlistIcon, { scale: 0.8 }, { scale: 1.3, duration: 0.2, yoyo: true, repeat: 1 });
  }

  // Update grids (heart visual active states)
  renderProducts();
  updateWishlistUI();

  // If Quick View Modal is active, update the wishlist heart inside it as well
  if (state.activeQuickViewProductId === productId) {
    if (active) {
      modalWishlistToggleBtn.classList.add("active");
      modalWishlistToggleBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    } else {
      modalWishlistToggleBtn.classList.remove("active");
      modalWishlistToggleBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
  }
}

// ==========================================================================
// DRAWER AND MODAL TOGGLES
// ==========================================================================

// Open Side Drawers (cart/wishlist)
function openDrawer(drawerType) {
  closeAllDrawersAndModals();
  
  drawerBackdrop.classList.add("active");
  if (drawerType === "cart") {
    cartDrawer.classList.add("active");
  } else if (drawerType === "wishlist") {
    wishlistDrawer.classList.add("active");
  }
  document.body.style.overflow = "hidden"; // Prevent background scroll
}

// Close Drawers & Modals
function closeAllDrawersAndModals() {
  drawerBackdrop.classList.remove("active");
  cartDrawer.classList.remove("active");
  wishlistDrawer.classList.remove("active");
  modalBackdrop.classList.remove("active");
  document.body.style.overflow = ""; // Enable scroll
  state.activeQuickViewProductId = null;
}

// Open Quick View Modal
function openQuickView(productId) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  state.activeQuickViewProductId = productId;

  // Load content
  modalImg.src = prod.image;
  modalImg.alt = prod.name;
  modalCategory.innerText = prod.category;
  modalTitle.innerText = prod.name;
  modalPrice.innerText = formatINR(prod.price);
  
  if (prod.oldPrice) {
    modalOldPrice.innerText = formatINR(prod.oldPrice);
    modalOldPrice.style.display = "inline";
  } else {
    modalOldPrice.style.display = "none";
  }

  modalDesc.innerText = prod.description;

  // Setup Wishlist icon active state inside modal
  const isWishlisted = state.wishlist.includes(productId);
  if (isWishlisted) {
    modalWishlistToggleBtn.classList.add("active");
    modalWishlistToggleBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
  } else {
    modalWishlistToggleBtn.classList.remove("active");
    modalWishlistToggleBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
  }

  // Display Modal
  modalBackdrop.classList.add("active");
  document.body.style.overflow = "hidden";
}

// ==========================================================================
// INITIALIZATION & GSAP ANIMATIONS
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial State setup & Render
  renderProducts();
  updateCartUI();
  updateWishlistUI();

  // 2. Global Event Listeners
  
  // Navigation actions triggers
  document.getElementById("cart-trigger-btn").addEventListener("click", () => openDrawer("cart"));
  document.getElementById("wishlist-trigger-btn").addEventListener("click", () => openDrawer("wishlist"));
  
  // Drawer close actions
  document.getElementById("cart-close-btn").addEventListener("click", closeAllDrawersAndModals);
  document.getElementById("wishlist-close-btn").addEventListener("click", closeAllDrawersAndModals);
  
  // Click backdrop to close
  drawerBackdrop.addEventListener("click", closeAllDrawersAndModals);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeAllDrawersAndModals();
  });
  document.getElementById("modal-close-btn").addEventListener("click", closeAllDrawersAndModals);

  // Quick View Actions
  modalAddToCartBtn.addEventListener("click", () => {
    if (state.activeQuickViewProductId) {
      addToCart(state.activeQuickViewProductId);
      closeAllDrawersAndModals();
      openDrawer("cart");
    }
  });

  modalWishlistToggleBtn.addEventListener("click", () => {
    if (state.activeQuickViewProductId) {
      toggleWishlist(state.activeQuickViewProductId);
    }
  });

  // Empty states shop CTAs
  document.getElementById("cart-empty-shop-btn").addEventListener("click", closeAllDrawersAndModals);
  document.getElementById("wishlist-empty-shop-btn").addEventListener("click", closeAllDrawersAndModals);

  // Sticky / Scrolled Header
  window.addEventListener("scroll", () => {
    const header = document.getElementById("header");
    if (window.scrollY > 50) {
      header.classList.remove("transparent");
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
      header.classList.add("transparent");
    }
  });

  // Mobile navigation drawer toggle
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  mobileToggle.addEventListener("click", () => {
    document.body.classList.toggle("mobile-menu-active");
    
    // Toggle bar icon to cross icon
    const icon = mobileToggle.querySelector("i");
    if (document.body.classList.contains("mobile-menu-active")) {
      icon.className = "fa-solid fa-xmark";
    } else {
      icon.className = "fa-solid fa-bars";
    }
  });

  // Close mobile nav when clicking layout links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.body.classList.remove("mobile-menu-active");
      mobileToggle.querySelector("i").className = "fa-solid fa-bars";
    });
  });

  // Checkout click handler
  document.getElementById("checkout-btn").addEventListener("click", () => {
    alert("Proceeding to checkout with " + state.cart.reduce((sum, item) => sum + item.qty, 0) + " items. Thank you for shopping with RV JEWELLS!");
    state.cart = [];
    updateCartUI();
    closeAllDrawersAndModals();
  });

  // Category navigation quick filter (just triggers scroll to Best Sellers catalog)
  document.querySelectorAll(".category-item").forEach(item => {
    item.addEventListener("click", (e) => {
      // Small highlight logic or custom analytics can trigger here
    });
  });

  // 3. GSAP ANIMATIONS PIPELINE
  gsap.registerPlugin(ScrollTrigger);

  // A. Loader fade-out and entrance timeline
  const loaderTimeline = gsap.timeline({
    onComplete: () => {
      // Remove loader from DOM to keep DOM clean
      const loader = document.getElementById("loader");
      if (loader) loader.style.display = "none";
    }
  });

  // Simulating load progress
  loaderTimeline.to(".loader-progress", {
    duration: 1.5,
    left: "0%",
    ease: "power2.out"
  });

  loaderTimeline.to("#loader", {
    duration: 0.6,
    opacity: 0,
    ease: "power2.inOut"
  });

  // Trigger Hero entrance immediately after loader fades out
  loaderTimeline.add(() => {
    if (document.getElementById("hero-tagline-text")) {
      // Hero Entrance
      gsap.from("#hero-tagline-text", { opacity: 0, y: 30, duration: 1.2, ease: "power4.out" });
      gsap.from("#hero-title-text", { opacity: 0, y: 40, duration: 1.2, delay: 0.15, ease: "power4.out" });
      gsap.from("#hero-desc-text", { opacity: 0, y: 30, duration: 1.2, delay: 0.3, ease: "power4.out" });
      gsap.from("#hero-actions-container", { opacity: 0, y: 30, duration: 1.2, delay: 0.45, ease: "power4.out" });
      
      gsap.from(".hero-circle-bg", { scale: 0.8, opacity: 0, duration: 1.6, delay: 0.1, ease: "power3.out" });
      gsap.from(".hero-image-container", { scale: 1.12, opacity: 0, duration: 1.6, delay: 0.2, ease: "power3.out" });
      
      // Floating sparkles animation trigger
      gsap.to(".sparkle", {
        opacity: 0.7,
        duration: 1,
        stagger: 0.2,
        onComplete: () => {
          // Floating loop
          gsap.to(".sparkle", {
            y: "-=15",
            rotation: "+=30",
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
          });
        }
      });
    }
  });

  // B. Scroll Triggered reveals
  
  // Section Headers Reveal
  document.querySelectorAll(".section-padding").forEach(sec => {
    const subtitle = sec.querySelector(".section-subtitle");
    const title = sec.querySelector(".section-title");

    if (subtitle && title) {
      const headerTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: "top 85%",
          toggleActions: "play none none none"
        }
      });

      headerTimeline.from(subtitle, { opacity: 0, y: 20, duration: 0.8, ease: "power2.out" });
      headerTimeline.from(title, { opacity: 0, y: 20, duration: 0.8, delay: -0.5, ease: "power2.out" });
    }
  });

  // Collection Banner Parallax/Hover zooms
  gsap.from("#col-liquid-gold", {
    scrollTrigger: {
      trigger: "#collections",
      start: "top 75%"
    },
    x: -50,
    opacity: 0,
    duration: 1.2,
    ease: "power3.out"
  });

  gsap.from("#col-modern-vintage", {
    scrollTrigger: {
      trigger: "#collections",
      start: "top 75%"
    },
    x: 50,
    opacity: 0,
    duration: 1.2,
    ease: "power3.out"
  });

  // Best Sellers Grid Cards Reveal Stagger
  gsap.from("#best-sellers-grid", {
    scrollTrigger: {
      trigger: "#best-sellers-grid",
      start: "top 80%"
    },
    y: 60,
    opacity: 0,
    duration: 1,
    ease: "power3.out"
  });

  // New Arrivals Cards Reveal Stagger
  gsap.from("#new-arrivals-grid", {
    scrollTrigger: {
      trigger: "#new-arrivals-grid",
      start: "top 80%"
    },
    y: 60,
    opacity: 0,
    duration: 1,
    ease: "power3.out"
  });

  // Category items zoom reveal
  gsap.from(".category-item", {
    scrollTrigger: {
      trigger: "#categories",
      start: "top 80%"
    },
    scale: 0.85,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: "power2.out"
  });

  // Why Us cards reveal
  gsap.from(".why-card", {
    scrollTrigger: {
      trigger: "#why-us",
      start: "top 80%"
    },
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: "power2.out"
  });

  // Instagram Cards Reveal
  gsap.from(".insta-card", {
    scrollTrigger: {
      trigger: "#instagram",
      start: "top 85%"
    },
    scale: 0.95,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: "power2.out"
  });
});
