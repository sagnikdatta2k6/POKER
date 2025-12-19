# ♠ Velvet Casino

A web-based casino arcade built from scratch. I wanted to see if I could replicate the feel of a high-stakes table—felt textures, 3D perspective, and card animations—using just standard web technologies without any heavy game engines.

Currently features **Texas Hold'em** and **Blackjack**.

👉 **[Play the Live Demo](YOUR_GITHUB_PAGES_LINK_HERE)**

![Game Screenshot](https://via.placeholder.com/800x400?text=Gameplay+Screenshot)

---

## What's Under the Hood?

I stuck to **Vanilla JavaScript** for this. No React, no Phaser, just raw logic.

### 1. The Game Engines
* **Poker Logic:** I wrote a custom hand evaluator (`HandEvaluator` object) that actually calculates hand ranks. It knows the difference between a Flush, a Full House, and a Straight using set theory logic. It's not just random RNG; it compares your 7 cards against the dealer's.
* **Blackjack:** Standard rules. Dealer hits on soft 16, stands on 17. Aces dynamically switch value (1 or 11) to prevent busts.

### 2. The Visuals (CSS)
* **3D Table:** The table isn't an image. It's a CSS element using `perspective` and `rotateX` to get that tilted view.
* **Animations:** Dealing cards uses `async/await` in the JavaScript to pause execution between cards, allowing the CSS transitions to finish. This creates that "snap" effect when cards fly onto the table.

---

## How to Run It

Since there are no build steps or bundlers (like Webpack), you can run this instantly.

1.  Clone the repo:
    ```bash
    git clone [Play Poker](https://github.com/sagnikdatta2k6/POKER)
    ```
2.  Open `index.html` in your browser.

That's it.

---

## Current Status & To-Do

The game is playable, but there are a few things I might add later:

* **Betting System:** Currently, the poker betting is simplified (fixed raises). I want to add a slider for custom bet amounts.
* **Sound:** Need to find some good, royalty-free chip clicking sounds.
* **Mobile Tweaks:** It works on mobile, but the landscape view could be optimized.

---

**Built by Sagnik**