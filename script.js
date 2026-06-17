/**
 * Chocopuff Core Script — FIXED VERSION
 * Fixes:
 * #1  - Checkout modal: navbar no longer overlaps it (z-index fix + body scroll lock)
 * #2  - Placeholder text removed from name/phone/address fields
 * #3  - Phone (11 digits), postal code (4 digits), card number, expiry, CVV = numbers only
 * #4  - Progress step-bar line now renders correctly
 * #5  - Clicks outside checkout modal dismissed; shopping-bag icon opens/closes drawer
 * #6  - (CSS fix in style.css) "Puff like Choco" badge is yellow in dark mode
 * #7  - (HTML meta viewport fix) scale normalised
 * #8  - NEW: SMS order tracking (preparing -> out for delivery) via backend, see /backend folder
 */

// ==========================================================
// SMS ORDER TRACKING CONFIG
// Point this at wherever you run the backend from the /backend folder.
// Local testing: http://localhost:4000
// Once deployed (Render/Railway/your own server), change this to that URL,
// e.g. 'https://chocopuff-sms-backend.onrender.com'
// ==========================================================
const CHOCOPUFF_SMS_API_BASE = 'https://chocopuff-backend.onrender.com';

// 1. Initialize global state array from localStorage right away to keep data across pages
let shoppingCartState = JSON.parse(localStorage.getItem('chocopuff_cart')) || [];

document.addEventListener('DOMContentLoaded', () => {

    // ========================================================
    // 0. MOBILE HAMBURGER NAVIGATION
    // ========================================================
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // ========================================================
    // 1. SCROLL ANIMATION ENGINE (Intersection Observer)
    // ========================================================
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));


    // ========================================================
    // 2. SIDEBAR DRAWER TOGGLE — FIX #5
    //    - Cart bag icon opens AND closes drawer (toggle)
    //    - Clicking outside the modal does NOT close drawer when checkout is open
    // ========================================================
    const cartToggleBtn   = document.getElementById('cart-toggle-btn');
    const addCartTrigger  = document.getElementById('add-to-cart-trigger');
    const drawerCloseTrigger = document.getElementById('drawer-close-trigger');
    const drawerContinueBtn  = document.getElementById('drawer-continue-btn');

    const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
    const cartSidebarDrawer = document.getElementById('cart-sidebar-drawer');
    const drawerItemsList       = document.getElementById('drawer-items-list');
    const drawerCalculatedTotal = document.getElementById('drawer-calculated-total');
    const globalCartBadge       = document.getElementById('global-cart-badge');
    const showcasePanel         = document.getElementById('product-showcase-panel');

    function openCartDrawer() {
        if (cartSidebarDrawer && cartDrawerOverlay) {
            cartSidebarDrawer.classList.add('drawer-active');
            cartDrawerOverlay.classList.add('drawer-active');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }
    }

    function closeCartDrawer() {
        if (cartSidebarDrawer && cartDrawerOverlay) {
            cartSidebarDrawer.classList.remove('drawer-active');
            cartDrawerOverlay.classList.remove('drawer-active');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    }

    function isDrawerOpen() {
        return cartSidebarDrawer && cartSidebarDrawer.classList.contains('drawer-active');
    }

    // FIX #5: toggle open/close on bag icon click
    if (cartToggleBtn) {
        cartToggleBtn.addEventListener('click', () => {
            if (isDrawerOpen()) {
                closeCartDrawer();
            } else {
                openCartDrawer();
            }
        });
    }

    if (drawerCloseTrigger) drawerCloseTrigger.addEventListener('click', closeCartDrawer);
    if (drawerContinueBtn)  drawerContinueBtn.addEventListener('click', closeCartDrawer);

    // FIX #5: clicking the overlay closes the DRAWER but NOT the checkout modal
    if (cartDrawerOverlay) {
        cartDrawerOverlay.addEventListener('click', () => {
            // Only close drawer, not the checkout modal
            closeCartDrawer();
        });
    }


    // ========================================================
    // 3. CORE COMMERCE CALCULATION & INVENTORY ENGINE
    // ========================================================

    function saveCartToStorage() {
        localStorage.setItem('chocopuff_cart', JSON.stringify(shoppingCartState));
    }

    function renderCartDrawerDOM() {
        if (!drawerItemsList) return;

        drawerItemsList.innerHTML = '';

        if (shoppingCartState.length === 0) {
            drawerItemsList.innerHTML = '<div class="empty-cart-notice">Your shopping bag is empty.</div>';
            if (globalCartBadge)        globalCartBadge.textContent = '0';
            if (drawerCalculatedTotal)  drawerCalculatedTotal.textContent = '₱0.00';
            return;
        }

        let runningTotal = 0;
        let runningCount = 0;

        shoppingCartState.forEach(item => {
            const subTotal = item.price * item.quantity;
            runningTotal += subTotal;
            runningCount += item.quantity;

            const imgSrc = item.img || item.image || 'logo.png';
            const row = document.createElement('div');
            row.classList.add('cart-item-card-row');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:15px 0;border-bottom:1px solid #f0f0f0;gap:12px;';

            row.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;flex:1;">
                    <div class="item-thumbnail-box" style="width:50px;height:50px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                        <img src="${imgSrc}" alt="${item.title || 'Product'}" style="width:100%;height:100%;object-fit:contain;">
                    </div>
                    <div class="item-core-details">
                        <h3 style="margin:0;font-size:14px;font-weight:700;color:#333;">${item.title}</h3>
                        <div class="item-subtype-tagline" style="font-size:11px;color:#888;">${item.subtitle || ''}</div>
                        <div class="item-interactive-actions-row" style="display:flex;align-items:center;gap:10px;margin-top:4px;">
                            <div class="quantity-picker-matrix" style="display:flex;align-items:center;border:1px solid #e0e0e0;border-radius:20px;overflow:hidden;background:#fff;">
                                <button class="quantity-modify-btn minus-decrement-btn" data-id="${item.id}" style="border:none;background:none;padding:2px 8px;cursor:pointer;">-</button>
                                <span class="quantity-value-display" style="font-size:12px;font-weight:600;min-width:14px;text-align:center;">${item.quantity}</span>
                                <button class="quantity-modify-btn plus-increment-btn" data-id="${item.id}" style="border:none;background:none;padding:2px 8px;cursor:pointer;">+</button>
                            </div>
                            <button class="item-remove-trigger" data-id="${item.id}" style="border:none;background:none;color:#ff4d4d;font-size:12px;cursor:pointer;padding:0;">Remove</button>
                        </div>
                    </div>
                </div>
                <div class="item-pricing-label" style="font-weight:600;color:#ff8a00;">₱${subTotal.toFixed(2)}</div>
            `;
            drawerItemsList.appendChild(row);
        });

        if (globalCartBadge)        globalCartBadge.textContent = runningCount;
        if (drawerCalculatedTotal)  drawerCalculatedTotal.textContent = `₱${runningTotal.toFixed(2)}`;

        bindItemInteractionTriggers();
    }

    function processCartInsertion(id, title, subtitle, price, img) {
        const idx = shoppingCartState.findIndex(i => i.id === id);
        if (idx > -1) {
            shoppingCartState[idx].quantity += 1;
        } else {
            shoppingCartState.push({ id, title, subtitle, price, img, image: img, quantity: 1 });
        }
        saveCartToStorage();
        renderCartDrawerDOM();
        openCartDrawer();
    }

    // Shop page card click
    document.body.addEventListener('click', (event) => {
        const clickedBtn = event.target.closest('.add-to-cart-btn');
        if (!clickedBtn) return;

        const cardWrapper = clickedBtn.closest('.premium-product-card');
        if (cardWrapper) {
            event.preventDefault();
            const productTitle    = cardWrapper.querySelector('h3').textContent.trim();
            const productSubtitle = cardWrapper.querySelector('.product-category-label')?.textContent.trim() || '';
            const rawPrice        = cardWrapper.querySelector('.product-price').textContent.trim();
            const productPrice    = parseFloat(rawPrice.replace('₱', '').replace(/,/g, ''));
            const imgEl           = cardWrapper.querySelector('.card-image-holder img');
            const productImg      = imgEl ? imgEl.getAttribute('src') : 'logo.png';
            const productId       = productTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
            processCartInsertion(productId, productTitle, productSubtitle, productPrice, productImg);
        }
    });

    // Single product page
    function addProductToCartItemArray() {
        if (!showcasePanel) return;
        const productId       = showcasePanel.getAttribute('data-id')    || 'unknown-product';
        const productTitle    = showcasePanel.getAttribute('data-title')  || 'Chocopuff Premium';
        const productSubtitle = showcasePanel.getAttribute('data-subtitle') || '';
        const productPrice    = parseFloat(showcasePanel.getAttribute('data-price')) || 0;
        const productImg      = showcasePanel.getAttribute('data-img')   || 'logo.png';
        processCartInsertion(productId, productTitle, productSubtitle, productPrice, productImg);
    }

    if (addCartTrigger) addCartTrigger.addEventListener('click', addProductToCartItemArray);

    function bindItemInteractionTriggers() {
        document.querySelectorAll('.plus-increment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id  = e.currentTarget.getAttribute('data-id');
                const idx = shoppingCartState.findIndex(i => i.id === id);
                if (idx > -1) { shoppingCartState[idx].quantity += 1; saveCartToStorage(); renderCartDrawerDOM(); }
            });
        });
        document.querySelectorAll('.minus-decrement-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id  = e.currentTarget.getAttribute('data-id');
                const idx = shoppingCartState.findIndex(i => i.id === id);
                if (idx > -1) {
                    if (shoppingCartState[idx].quantity > 1) { shoppingCartState[idx].quantity -= 1; }
                    else { shoppingCartState.splice(idx, 1); }
                    saveCartToStorage(); renderCartDrawerDOM();
                }
            });
        });
        document.querySelectorAll('.item-remove-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                shoppingCartState = shoppingCartState.filter(i => i.id !== id);
                saveCartToStorage(); renderCartDrawerDOM();
            });
        });
    }

    renderCartDrawerDOM();
});

/* ==========================================================
   INTERACTIVE SEARCH & LIVE ROUTING ENGINE
   ========================================================== */
const searchInput = document.getElementById('nav-search-input');
const searchBtn   = document.getElementById('nav-search-btn');

function executeProductSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return;

    const routeCatalog = {
        'berry':      'product-berry.html',
        'blueberry':  'product-berry.html',
        'sprinkle':   'product-sprinkle.html',
        'sprinkles':  'product-sprinkle.html',
        'coconut':    'product-coconut.html',
        'matcha':     'product-matcha.html',
        'green tea':  'product-matcha.html',
        'caramel':    'product-caramel.html',
        'mint':       'product-mint.html',
        'peppermint': 'product-mint.html',
        'mango':      'product-mango.html',
        'hazelnut':   'product-hazelnut.html',
        'cookie':     'product-cookies.html',
        'cookies':    'product-cookies.html',
        'shop':       'shop.html',
        'store':      'shop.html',
        'about':      'about.html',
        'home':       'index.html'
    };

    let target = '';
    for (const key in routeCatalog) {
        if (query.includes(key)) { target = routeCatalog[key]; break; }
    }
    window.location.href = target || 'shop.html';
}

if (searchInput) {
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeProductSearch(); });
}
if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
        if (searchInput.style.width === '0px' || !searchInput.style.width || searchInput.style.opacity === '0' || searchInput.style.opacity === '') {
            e.preventDefault();
            searchInput.style.width   = '150px';
            searchInput.style.opacity = '1';
            searchInput.style.padding = '4px 10px';
            searchInput.style.border  = '1px solid #ccc';
            searchInput.focus();
        } else {
            executeProductSearch();
        }
    });
}


/* ==========================================================
   DARK MODE PERSISTENCE ENGINE
   ========================================================== */
const themeToggleBtn = document.getElementById('theme-toggle-btn');

if (localStorage.getItem('chocopuff-theme') === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeToggleBtn?.querySelector('i')) {
        themeToggleBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const dark = document.body.classList.contains('dark-mode');
        localStorage.setItem('chocopuff-theme', dark ? 'dark' : 'light');
        const icon = themeToggleBtn.querySelector('i');
        if (icon) { icon.classList.replace(dark ? 'fa-moon' : 'fa-sun', dark ? 'fa-sun' : 'fa-moon'); }
    });
}

/* ==========================================================
   TERMS CONSENT MODAL
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const termsOverlay    = document.getElementById('terms-modal-overlay');
    const termsAcceptBtn  = document.getElementById('terms-accept-btn');
    const footerPrivacy   = document.getElementById('footer-privacy-link');
    const footerTerms     = document.getElementById('footer-terms-link');

    if (termsOverlay) {
        if (!localStorage.getItem('chocopuff-terms-accepted')) {
            termsOverlay.style.display = 'flex';
        }
        if (termsAcceptBtn) {
            termsAcceptBtn.addEventListener('click', () => {
                localStorage.setItem('chocopuff-terms-accepted', 'true');
                termsOverlay.style.display = 'none';
            });
        }
        if (footerPrivacy) {
            footerPrivacy.addEventListener('click', (e) => { e.preventDefault(); termsOverlay.style.display = 'flex'; });
        }
        if (footerTerms) {
            footerTerms.addEventListener('click', (e) => { e.preventDefault(); termsOverlay.style.display = 'flex'; });
        }
    }
});

/* ==========================================================
   SCROLL RESTORE FOR SHOP PAGE
   ========================================================== */
document.addEventListener('click', (e) => {
    if (e.target.closest('.product-detail-link-wrapper')) {
        sessionStorage.setItem('shopScrollPos', window.scrollY);
    }
});

window.addEventListener('load', () => {
    if (window.location.pathname.includes('shop.html')) {
        const saved = sessionStorage.getItem('shopScrollPos');
        if (saved) {
            setTimeout(() => {
                const headerH = document.querySelector('header')?.offsetHeight || 0;
                window.scrollTo(0, Math.max(parseInt(saved, 10) - headerH, 0));
                sessionStorage.removeItem('shopScrollPos');
            }, 60);
        }
    }
});


/* ==========================================================
   CHECKOUT WIZARD — FIX #1 #2 #3 #4 #5
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {

    const checkoutContainer = document.createElement('div');
    checkoutContainer.id        = 'global-checkout-modal';
    checkoutContainer.className = 'checkout-modal-shroud';

    // FIX #2: Removed personal placeholder texts from name/phone/address
    // FIX #3: phone/postal/card/expiry/cvv are numbers-only with proper maxlength
    checkoutContainer.innerHTML = `
        <div class="checkout-window">
            <button class="checkout-close-btn" id="close-checkout-modal">&times;</button>

            <h3>Secure Checkout</h3>
            <p style="font-size:14px;color:#a38a75;margin-bottom:10px;">Complete your puff-tastic order setup</p>

            <!-- FIX #4: progress bar with proper relative wrapper -->
            <div class="checkout-progress-bar">
                <div class="progress-line-fill" id="checkout-progress-line"></div>
                <div class="step-node active" data-step="1">1</div>
                <div class="step-node" data-step="2">2</div>
                <div class="step-node" data-step="3">3</div>
            </div>

            <!-- STEP 1: Delivery -->
            <div class="checkout-step-panel active" id="checkout-panel-1">
                <h4>1. Delivery Information</h4>
                <div class="form-field">
                    <label>Full Name</label>
                    <!-- FIX #2: empty placeholder -->
                    <input type="text" id="chk-name" placeholder="" autocomplete="name" required>
                </div>
                <div class="form-group-row">
                    <div class="form-field">
                        <label>Phone Number</label>
                        <!-- FIX #3: type=tel, inputmode=numeric, maxlength=11, pattern digits only -->
                        <input type="tel" id="chk-phone" placeholder="" inputmode="numeric" maxlength="11" pattern="[0-9]{11}" autocomplete="tel" required>
                    </div>
                    <div class="form-field">
                        <label>Postal Code</label>
                        <!-- FIX #3: maxlength=4, digits only -->
                        <input type="tel" id="chk-zip" placeholder="" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="postal-code" required>
                    </div>
                </div>
                <div class="form-field">
                    <label>Home Delivery Address</label>
                    <!-- FIX #2: empty placeholder -->
                    <input type="text" id="chk-address" placeholder="" autocomplete="street-address" required>
                </div>
                <div class="form-field">
                    <label>City / Municipality</label>
                    <select id="chk-city">
                        <option value="Alabel">Alabel (Local Hub Delivery)</option>
                        <option value="General Santos City">General Santos City</option>
                        <option value="Malapatan">Malapatan</option>
                        <option value="Glan">Glan</option>
                    </select>
                </div>
            </div>

            <!-- STEP 2: Payment -->
            <div class="checkout-step-panel" id="checkout-panel-2">
                <h4>2. Select Payment Method</h4>
                <div class="payment-options-grid">
                    <div class="payment-selector-card selected" data-method="cod">
                        <input type="radio" name="pay-method" id="pay-cod" checked>
                        <i class="fas fa-hand-holding-dollar"></i>
                        <div>
                            <strong style="display:block;font-size:14px;">Cash on Delivery (COD)</strong>
                            <small style="color:#a38a75;font-size:12px;">Pay right at your doorstep upon arrival.</small>
                        </div>
                    </div>
                    <div class="payment-selector-card" data-method="gcash">
                        <input type="radio" name="pay-method" id="pay-gcash">
                        <i class="fas fa-wallet"></i>
                        <div>
                            <strong style="display:block;font-size:14px;">E-Wallet (GCash / Maya)</strong>
                            <small style="color:#a38a75;font-size:12px;">Instant, seamless mobile payment authorization.</small>
                        </div>
                    </div>
                    <div class="payment-selector-card" data-method="card">
                        <input type="radio" name="pay-method" id="pay-card">
                        <i class="fas fa-credit-card"></i>
                        <div>
                            <strong style="display:block;font-size:14px;">Credit / Debit Card</strong>
                            <small style="color:#a38a75;font-size:12px;">Supports Visa, Mastercard, and JCB.</small>
                        </div>
                    </div>
                </div>

                <div id="card-details-subform" style="display:none;border-top:2px solid #fbf5ee;padding-top:15px;">
                    <div class="form-field">
                        <label>Card Number</label>
                        <!-- FIX #3: numbers only, max 16 digits -->
                        <input type="tel" id="chk-cardnum" placeholder="" inputmode="numeric" maxlength="16" pattern="[0-9]{16}">
                    </div>
                    <div class="form-group-row">
                        <div class="form-field">
                            <label>Expiry Date (MMYY)</label>
                            <!-- FIX #3: numbers only, 4 digits -->
                            <input type="tel" id="chk-cardexpiry" placeholder="MMYY" inputmode="numeric" maxlength="4" pattern="[0-9]{4}">
                        </div>
                        <div class="form-field">
                            <label>CVV</label>
                            <!-- FIX #3: numbers only, max 3 -->
                            <input type="tel" id="chk-cardcvv" placeholder="" inputmode="numeric" maxlength="3" pattern="[0-9]{3}">
                        </div>
                    </div>
                </div>
            </div>

            <!-- STEP 3: Review -->
            <div class="checkout-step-panel" id="checkout-panel-3">
                <h4>3. Final Review &amp; Confirm</h4>
                <div class="order-review-block">
                    <div class="review-row"><span>Delivery Destination:</span><strong id="rev-dest">Alabel</strong></div>
                    <div class="review-row"><span>Payment Channel:</span><strong id="rev-pay">Cash on Delivery</strong></div>
                    <div class="review-row"><span>Estimated Shipping:</span><span style="color:#2e7d32;font-weight:600;">FREE</span></div>
                    <div class="review-row total-bold"><span>Grand Total:</span><span id="rev-total">₱0.00</span></div>
                </div>
                <p style="font-size:13px;color:#5c4a3c;text-align:center;line-height:1.4;">By clicking Place Order, your confectionery package will immediately register on our baking logs.</p>
            </div>

            <!-- STEP 4: Success -->
            <div class="checkout-step-panel" id="checkout-panel-4">
                <div class="success-panel-box">
                    <div class="success-icon-wrapper"><i class="fas fa-cookie-bite"></i></div>
                    <h3 style="color:#2e7d32;">Thank you for your purchase! 🎉</h3>
                    <p style="font-size:15px;margin:10px 0 20px;line-height:1.5;color:#5c4a3c;">Your premium order has been approved with <strong>High Honors</strong>! The kitchen team is already whipping up your fresh marshmallow fillings.</p>
                    <div style="background:#fbf5ee;padding:15px;border-radius:12px;font-size:13px;text-align:left;color:#2b1a08;">
                        <span style="display:block;margin-bottom:4px;"><strong>Status:</strong> Preparing Batch</span>
                        <span style="display:block;"><strong>Estimated Delivery:</strong> Within 24–48 hours</span>
                    </div>
                </div>
            </div>

            <div class="checkout-actions-row" id="checkout-buttons-bar">
                <button class="btn-checkout-nav btn-back" id="btn-checkout-prev" style="display:none;">Back</button>
                <button class="btn-checkout-nav btn-next" id="btn-checkout-next">Continue to Payment</button>
            </div>
        </div>
    `;
    document.body.appendChild(checkoutContainer);

    /* --- enforce digits-only on numeric fields --- */
    // FIX #3: strip any non-digit on every input event
    ['chk-phone', 'chk-zip', 'chk-cardnum', 'chk-cardexpiry', 'chk-cardcvv'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                el.value = el.value.replace(/\D/g, '');
            });
        }
    });

    // State
    let currentStep = 1;
    const modalShroud  = document.getElementById('global-checkout-modal');
    const closeBtn     = document.getElementById('close-checkout-modal');
    const btnNext      = document.getElementById('btn-checkout-next');
    const btnPrev      = document.getElementById('btn-checkout-prev');
    const progressLine = document.getElementById('checkout-progress-line');
    const buttonsBar   = document.getElementById('checkout-buttons-bar');

    // Payment card selection
    document.querySelectorAll('.payment-selector-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.payment-selector-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input[type="radio"]').checked = true;
            const subform = document.getElementById('card-details-subform');
            if (subform) subform.style.display = card.dataset.method === 'card' ? 'block' : 'none';
        });
    });

    // FIX #1 & #5: Open checkout when "Checkout" cart button is clicked
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('cart-checkout-btn')) {
            const cartTotalEl = document.getElementById('drawer-calculated-total');
            const totalText   = cartTotalEl ? cartTotalEl.innerText : '₱0.00';

            if (totalText === '₱0.00' || totalText === '0') {
                alert('Your shopping cart bag is completely empty! Add some flavors first.');
                return;
            }

            // Close cart drawer
            const cartSidebar  = document.getElementById('cart-sidebar-drawer');
            const cartOverlay  = document.getElementById('cart-drawer-overlay');
            if (cartSidebar) { cartSidebar.classList.remove('active', 'drawer-active'); }
            if (cartOverlay)  { cartOverlay.classList.remove('active', 'drawer-active'); }
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';

            document.getElementById('rev-total').innerText = totalText;
            currentStep = 1;
            buttonsBar.style.display = 'flex';
            closeBtn.style.display   = 'flex';
            updateStepDisplay();
            modalShroud.classList.add('active');
        }
    });

    // Close checkout
    const resetModal = () => modalShroud.classList.remove('active');
    closeBtn.addEventListener('click', resetModal);

    // FIX #5: clicking the dark shroud of the CHECKOUT modal closes it
    modalShroud.addEventListener('click', (e) => {
        if (e.target === modalShroud) resetModal();
    });

    // FIX #4: Step display update
    function updateStepDisplay() {
        document.querySelectorAll('.checkout-step-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`checkout-panel-${currentStep}`);
        if (panel) panel.classList.add('active');

        document.querySelectorAll('.step-node').forEach(node => {
            const ns = parseInt(node.dataset.step, 10);
            node.className = 'step-node';
            if (ns === currentStep) node.classList.add('active');
            if (ns < currentStep)  node.classList.add('completed');
        });

        // FIX #4: progress line — 3 steps → 0%, 50%, 100%
        const pct = ((currentStep - 1) / 2) * 100;
        if (progressLine) progressLine.style.width = `${pct}%`;

        if (currentStep === 1) {
            btnPrev.style.display = 'none';
            btnNext.innerText = 'Continue to Payment';
        } else if (currentStep === 2) {
            btnPrev.style.display = 'block';
            btnNext.innerText = 'Review Order';
        } else if (currentStep === 3) {
            btnPrev.style.display = 'block';
            btnNext.innerText = 'Place Order';
            const city        = document.getElementById('chk-city')?.value || '';
            const selectedCard = document.querySelector('.payment-selector-card.selected');
            const payLabel    = selectedCard?.querySelector('strong')?.innerText || 'Cash on Delivery';
            document.getElementById('rev-dest').innerText = `${city}, Philippines`;
            document.getElementById('rev-pay').innerText  = payLabel;
        } else if (currentStep === 4) {
            buttonsBar.style.display = 'none';
            closeBtn.style.display   = 'none';

            // Clear cart
            localStorage.removeItem('chocopuff_cart');
            sessionStorage.removeItem('cart');
            shoppingCartState = [];

            const badge = document.getElementById('global-cart-badge');
            const list  = document.getElementById('drawer-items-list');
            const tot   = document.getElementById('drawer-calculated-total');
            if (badge) badge.innerText = '0';
            if (list)  list.innerHTML  = '<div class="empty-cart-notice">Your shopping bag is empty.</div>';
            if (tot)   tot.innerText   = '₱0.00';

            setTimeout(() => {
                modalShroud.classList.remove('active');
                setTimeout(() => window.location.reload(), 500);
            }, 6000);
        }
    }

    // ==========================================================
    // SMS ORDER TRACKING
    // Fires the moment "Place Order" is clicked (leaving step 3 = Review).
    // Sends the delivery info — including the phone number entered in
    // step 1 — to the backend in /backend, which texts that number:
    //   1) immediately:      "your order is preparing"
    //   2) ~1 minute later:  "your order is out for delivery"
    // See backend/README.md for setup. This never blocks or breaks
    // checkout — if the backend is offline, the order still completes.
    // ==========================================================
    function triggerOrderSmsTracking() {
        const name          = document.getElementById('chk-name')?.value.trim()    || '';
        const phone         = document.getElementById('chk-phone')?.value.trim()   || '';
        const address       = document.getElementById('chk-address')?.value.trim() || '';
        const city          = document.getElementById('chk-city')?.value           || '';
        const zip           = document.getElementById('chk-zip')?.value.trim()     || '';
        const selectedCard  = document.querySelector('.payment-selector-card.selected');
        const paymentMethod = selectedCard?.querySelector('strong')?.innerText || 'Cash on Delivery';

        const total = shoppingCartState.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const items = shoppingCartState.map(item => ({
            title: item.title, quantity: item.quantity, price: item.price
        }));

        fetch(`${CHOCOPUFF_SMS_API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, address, city, zip, paymentMethod, items, total })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (ok && data.orderId) {
                sessionStorage.setItem('chocopuff_last_order_id', data.orderId);
                console.log('SMS order tracking started for order', data.orderId);
            } else {
                console.warn('SMS backend responded with an issue:', data.error || data);
            }
        })
        .catch(err => {
            // Backend unreachable (not running, wrong URL, no internet, etc.)
            // Checkout still proceeds — the customer just won't get texts.
            console.warn('Could not reach the SMS tracking backend (is it running?):', err.message);
        });
    }

    btnNext.addEventListener('click', () => {
        if (currentStep === 1) {
            const name    = document.getElementById('chk-name')?.value.trim();
            const phone   = document.getElementById('chk-phone')?.value.trim();
            const address = document.getElementById('chk-address')?.value.trim();
            if (!name || !phone || !address) {
                alert('Please complete your delivery details before moving forward.');
                return;
            }
            // Validate phone = exactly 11 digits
            if (!/^\d{11}$/.test(phone)) {
                alert('Phone number must be exactly 11 digits.');
                return;
            }
            // Validate postal = exactly 4 digits
            const zip = document.getElementById('chk-zip')?.value.trim();
            if (!/^\d{4}$/.test(zip)) {
                alert('Postal code must be exactly 4 digits.');
                return;
            }
        }

        // Step 3 = Review panel. Clicking through here is "Place Order" —
        // this is the moment the order actually gets placed.
        if (currentStep === 3) {
            triggerOrderSmsTracking();
        }

        currentStep++;
        updateStepDisplay();
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 1) { currentStep--; updateStepDisplay(); }
    });
});


/* ==========================================================
   AUTO-SWIPING HERO CAROUSEL ENGINE (3-SEC LOOP)
   ========================================================== */
const carouselTrack  = document.getElementById('hero-carousel-track');
const indicatorsBox  = document.getElementById('carousel-indicators-box');

if (carouselTrack) {
    const slides      = carouselTrack.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;
    let slideIndex    = 0;
    let autoSwipeTimer;

    slides.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.classList.add('indicator-dot');
        if (idx === 0) dot.classList.add('active');
        dot.addEventListener('click', () => { jumpToSlide(idx); restartCarouselTimer(); });
        if (indicatorsBox) indicatorsBox.appendChild(dot);
    });

    function updateSliderPosition() {
        carouselTrack.style.transform = `translateX(-${slideIndex * 100}%)`;
        if (indicatorsBox) {
            indicatorsBox.querySelectorAll('.indicator-dot').forEach((d, i) => {
                d.classList.toggle('active', i === slideIndex);
            });
        }
    }

    function advanceSlide() { slideIndex = (slideIndex + 1) % totalSlides; updateSliderPosition(); }
    function jumpToSlide(idx) { slideIndex = idx; updateSliderPosition(); }
    function restartCarouselTimer() {
        clearInterval(autoSwipeTimer);
        autoSwipeTimer = setInterval(advanceSlide, 3000);
    }

    restartCarouselTimer();
    carouselTrack.addEventListener('mouseenter', () => clearInterval(autoSwipeTimer));
    carouselTrack.addEventListener('mouseleave', restartCarouselTimer);
}
// ========================================================
// LIVE GLOBAL CLOUD DATABASE REVIEWS ENGINE (100% FREE)
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeLiveChocopuffReviews();
});

function initializeLiveChocopuffReviews() {
    const reviewForm = document.getElementById('new-review-submission-form');
    if (!reviewForm) return; 

    const firebaseConfig = {
        apiKey: "AIzaSyBp_lNTRk6h8zH61vIQs4zd7XLZ-JawPKw",
        authDomain: "chocopuff-reviews.firebaseapp.com",
        projectId: "chocopuff-reviews",
        storageBucket: "chocopuff-reviews.firebasestorage.app",
        messagingSenderId: "257980856893",
        appId: "1:257980856893:web:3cd9a969ef419fb8f30854",
        measurementId: "G-VFTYSCK0WH"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    const pagePath = window.location.pathname;
    const filename = pagePath.substring(pagePath.lastIndexOf('/') + 1);
    let productKey = filename.replace('product-', '').replace('.html', '').trim().toLowerCase();

    if (productKey === 'sprinkles') productKey = 'sprinkle';
    if (!productKey) productKey = 'global-reviews';

    const feedContainer = document.getElementById('reviews-feed-container');

    // LIVE STREAM LISTENER
    db.collection("reviews")
      .where("product", "==", productKey)
      .orderBy("timestamp", "desc")
      .onSnapshot((snapshot) => {
          let reviewsList = [];
          snapshot.forEach((doc) => {
              reviewsList.push(doc.data());
          });
          renderReviewsUI(reviewsList);
      }, (error) => {
          console.error("Database sync failed: ", error);
      });

    // UI BUILDER
    function renderReviewsUI(reviewsList) {
        const totalReviews = reviewsList.length;
        const totalStarsSum = reviewsList.reduce((sum, item) => sum + item.rating, 0);
        const averageScore = totalReviews > 0 ? (totalStarsSum / totalReviews).toFixed(1) : "0.0";

        document.getElementById('average-rating-num').textContent = averageScore;
        document.getElementById('review-count-label').textContent = `(Based on ${totalReviews} review${totalReviews === 1 ? '' : 's'})`;

        const roundedScore = Math.round(parseFloat(averageScore));
        let starsHTML = '';
        
        if (totalReviews === 0) {
            starsHTML = `<i class="far fa-star"></i>`.repeat(5);
        } else {
            for (let i = 1; i <= 5; i++) {
                starsHTML += i <= roundedScore ? `<i class="fas fa-star"></i>` : `<i class="far fa-star"></i>`;
            }
        }
        document.getElementById('average-stars-display').innerHTML = starsHTML;

        if (totalReviews === 0) {
            feedContainer.innerHTML = `
                <div style="padding: 2rem 0; opacity: 0.6; font-style: italic;" class="count-text">
                    No reviews yet. Be the first to share your thoughts about this flavor!
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = reviewsList.map(review => {
            let userStarsHTML = '';
            for (let i = 1; i <= 5; i++) {
                userStarsHTML += i <= review.rating ? `<i class="fas fa-star"></i>` : `<i class="far fa-star"></i>`;
            }

            // Render image if the text link exists
            let embeddedImageHTML = '';
            if (review.imageUrl && review.imageUrl.trim() !== "") {
                embeddedImageHTML = `
                    <div class="review-image-container" style="margin-top: 1rem;">
                        <img src="${escapeHTML(review.imageUrl)}" alt="Product arrival proof" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); object-fit: cover;">
                    </div>
                `;
            }

            return `
                <div class="single-review-node" style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding: 1.5rem 0;">
                    <div class="review-meta-row">
                        <span class="review-author-title">${escapeHTML(review.author)}</span>
                        <div class="star-display-row">${userStarsHTML}</div>
                    </div>
                    <p class="review-text-paragraph">${escapeHTML(review.comment)}</p>
                    ${embeddedImageHTML}
                </div>
            `;
        }).join('');
    }

    // FORM SUBMISSION
    reviewForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const selectedRatingInput = document.querySelector('input[name="review_rating"]:checked');
        const authorField = document.getElementById('review-author-name');
        const commentField = document.getElementById('review-comment-body');
        const photoUrlField = document.getElementById('review-photo-url');

        if (!selectedRatingInput || !authorField.value.trim() || !commentField.value.trim()) return;

        const newLiveReview = {
            product: productKey,
            author: authorField.value.trim(),
            rating: parseInt(selectedRatingInput.value, 10),
            comment: commentField.value.trim(),
            imageUrl: photoUrlField ? photoUrlField.value.trim() : "", // Directly saves the text link!
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("reviews").add(newLiveReview)
            .then(() => {
                authorField.value = '';
                commentField.value = '';
                if (photoUrlField) photoUrlField.value = '';
                document.getElementById('star5').checked = true;
            })
            .catch(err => alert("Error saving review: " + err));
    });

    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}
// ========================================================
// AMAZON-STYLE LIVE SEARCH SUGGESTIONS WITH THUMBNAILS
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    initChocopuffSearchAutocomplete();
});

function initChocopuffSearchAutocomplete() {
    const searchInput = document.getElementById('nav-search-input');
    const dropdownContainer = document.getElementById('search-autocomplete-dropdown');
    
    if (!searchInput || !dropdownContainer) return;

    // 1. Define your catalog flavors, filenames, and image assets
    const productCatalog = [
        { name: "Chocopuff Berry", file: "product-berry.html", img: "Blueberry.png" },
        { name: "Chocopuff Sprinkles", file: "product-sprinkle.html", img: "Sprinkles.png" },
        { name: "Chocopuff Coconut", file: "product-coconut.html", img: "Coconut.png" },
        { name: "Chocopuff Matcha", file: "product-matcha.html", img: "Matcha.png" },
        { name: "Chocopuff Caramel", file: "product-caramel.html", img: "Caramel.png" },
        { name: "Chocopuff Mint", file: "product-mint.html", img: "Mint.png" },
        { name: "Chocopuff Mango", file: "product-mango.html", img: "Mango.png" },
        { name: "Chocopuff Hazelnut", file: "product-hazelnut.html", img: "Hazelnut.png" },
        { name: "Chocopuff Cookies & Cream", file: "product-cookies.html", img: "Cookies.png" }
    ];

    // 2. Listen to typing actions
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        
        // Hide dropdown if query input field is empty
        if (!query) {
            dropdownContainer.style.display = 'none';
            dropdownContainer.innerHTML = '';
            return;
        }

        // Filter catalog matches based on typed letters
        const matches = productCatalog.filter(item => 
            item.name.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            dropdownContainer.style.display = 'none';
            dropdownContainer.innerHTML = '';
            return;
        }

        // 3. Render matches with their thumbnails
        dropdownContainer.innerHTML = matches.map(product => `
            <a href="${product.file}" class="suggestion-item-row">
                <img src="${product.img}" alt="${product.name}" class="suggestion-thumbnail">
                <span class="suggestion-text">${product.name}</span>
            </a>
        `).join('');

        // Expand/Show suggestions box if your search bar is open and typing
        if (parseInt(window.getComputedStyle(searchInput).width) > 40) {
            dropdownContainer.style.display = 'block';
        }
    });

    // 4. Close the dropdown if clicking outside of the search area
    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !dropdownContainer.contains(event.target)) {
            dropdownContainer.style.display = 'none';
        }
    });

    // 5. Ensure dropdown aligns smoothly when expanding the search bar via button click
    const searchBtn = document.getElementById('nav-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            // Give search expanding transition an instant to finish before revealing dropdown container
            setTimeout(() => {
                if (searchInput.value.trim() && parseInt(window.getComputedStyle(searchInput).width) > 40) {
                    dropdownContainer.style.display = 'block';
                }
            }, 310);
        });
    }
} // <-- FIX: this closing brace for initChocopuffSearchAutocomplete() was missing in the original file,
  //          which would break parsing of this entire script in the browser.

