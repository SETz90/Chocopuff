from pathlib import Path
import re

base = Path(r'c:\Users\trisp\OneDrive\Documents\Chocopuff Website (Mock-up website figma)')
header = '''<header>
        <div class="container nav-container">
            <!-- LEFT COLUMN: Mobile Menu & Main Links -->
            <div class="nav-left-group">
                <button class="menu-toggle" aria-label="Toggle Navigation Card">
                    <span></span><span></span><span></span>
                </button>
                <nav class="nav-links">
                    <a href="index.html">Home</a>
                    <a href="shop.html">Shop</a>
                    <a href="about.html">About Us</a>
                </nav>
            </div>

            <!-- RIGHT COLUMN: Action Utilities & Search -->
            <div class="nav-actions">
                <a href="index.html#contact" class="text-link">Contact Us</a>
                
                <button id="theme-toggle-btn" class="icon-btn" aria-label="Toggle Dark Mode" style="background: none; border: none; cursor: pointer; padding: 5px; font-size: 16px;">
                    <i class="fas fa-moon"></i>
                </button>

                <button id="cart-toggle-btn" class="icon-btn cart-trigger-btn" aria-label="Open Cart">
                    <i class="fas fa-bag-shopping"></i>
                    <span id="global-cart-badge" class="cart-badge-count">0</span>
                </button>
                
                <div class="search-wrapper" style="display: inline-flex; align-items: center; position: relative; margin-left: 5px;">
                    <input type="text" id="nav-search-input" placeholder="Search flavor..." style="width: 0; opacity: 0; transition: all 0.3s ease; border: 1px solid #ccc; border-radius: 20px; padding: 4px 10px; font-size: 13px; outline: none; font-family: 'Quicksand', sans-serif; background-color: #fff; color: #000;">
                    <button id="nav-search-btn" class="icon-btn" style="background: none; border: none; cursor: pointer; padding: 5px;"><i class="fas fa-search"></i></button>
                </div>
            </div>
        </div>
    </header>'''

for path in sorted(base.glob('product-*.html')):
    text = path.read_text(encoding='utf-8')
    new_text, count = re.subn(r'<header>[\s\S]*?</header>', header, text, count=1)
    if count == 0:
        print(f'NO HEADER FOUND: {path}')
    else:
        path.write_text(new_text, encoding='utf-8')
        print(f'Updated {path}')
