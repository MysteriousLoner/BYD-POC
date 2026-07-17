const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const OFFERS_FILE = path.join(__dirname, '..', 'data', 'offers.json');

function readOffers() {
    try {
        return JSON.parse(fs.readFileSync(OFFERS_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

// Model keyword mappings for fuzzy matching
const MODEL_ALIASES = {
    'seal': ['seal', 'byde seal', 'byd seal'],
    'atto3': ['atto', 'atto 3', 'atto3', 'byd atto', 'byd atto 3'],
    'dolphin': ['dolphin', 'byd dolphin'],
    'sealion6': ['sealion', 'sealion 6', 'sealion6', 'sea lion', 'byd sealion'],
    'm6': ['m6', 'byd m6', 'mpv'],
    'shark6': ['shark', 'shark 6', 'shark6', 'byd shark', 'pickup', 'pick up', 'pick-up']
};

const OFFER_KEYWORDS = [
    'discount', 'rebate', 'cashback', 'offer', 'promotion', 'promo',
    'deal', 'price', 'special', 'sale', 'bonus', 'save', 'saving',
    'discounts', 'offers', 'promotions', 'deals'
];

const GENERAL_KEYWORDS = {
    'warranty': 'BYD vehicles come with a **6-year / 150,000km vehicle warranty** and an **8-year / 160,000km battery warranty** in Malaysia.',
    'showroom': 'BYD has **20+ showrooms** across Malaysia. Visit our website or contact Sime Darby Motors to find the nearest one.',
    'test drive': 'You can book a test drive at any BYD showroom or through our website. Just fill in the Book a Test Drive form! 😊',
    'charging': 'BYD vehicles support both **AC (Type 2)** and **DC fast charging (CCS2)**. Home chargers can be installed by BYD-authorised partners.',
    'contact': 'Contact BYD Malaysia through Sime Darby Motors at **+60 3-XXXX XXXX** or visit **byd.simemotors.my**.',
    'hello': 'Hello! 👋 I\'m the BYD Malaysia assistant. I can help you with our current **promotions, discounts, and cashback offers** for any BYD model. Just ask me about a specific car!',
    'hi': 'Hi there! 👋 Ask me about BYD offers, discounts, or any model — I\'m here to help!',
    'help': 'I can help with:\n\n• **Current offers** — discounts & cashback for each model\n• **Model info** — specs, range, pricing\n• **Warranty & service**\n• **Showrooms & test drives**\n• **Charging solutions**\n\nJust ask me something like "What offers for BYD Seal?"',
    'thank': 'You\'re welcome! Happy to help. Is there anything else you\'d like to know about BYD? 🚗⚡',
    'thanks': 'You\'re welcome! Feel free to ask if you need anything else. 🚗⚡',
    'bye': 'Goodbye! Feel free to come back anytime for more info about BYD. Drive electric! ⚡'
};

function findModel(query) {
    const q = query.toLowerCase();
    for (const [model, aliases] of Object.entries(MODEL_ALIASES)) {
        for (const alias of aliases) {
            if (q.includes(alias)) return model;
        }
    }
    return null;
}

function isOfferQuery(query) {
    const q = query.toLowerCase();
    return OFFER_KEYWORDS.some(kw => q.includes(kw));
}

function matchGeneral(query) {
    const q = query.toLowerCase();
    for (const [keyword, response] of Object.entries(GENERAL_KEYWORDS)) {
        if (q.includes(keyword)) return response;
    }
    return null;
}

function formatOfferResponse(offer) {
    const parts = [`**${offer.name}**\n`];

    if (offer.discount && offer.discount.amount > 0) {
        parts.push(`💰 **Discount:** ${offer.discount.description}`);
    } else if (offer.discount && offer.discount.type === 'none') {
        parts.push(`💰 **Discount:** ${offer.discount.description}`);
    }

    if (offer.cashback && offer.cashback.amount > 0) {
        parts.push(`🎁 **Cashback:** ${offer.cashback.description}`);
    }

    if (offer.validUntil) {
        const date = new Date(offer.validUntil);
        const formatted = date.toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
        parts.push(`📅 **Valid until:** ${formatted}`);
    }

    if (offer.terms) {
        parts.push(`\n📋 *${offer.terms}*`);
    }

    parts.push(`\n🔗 Visit a BYD showroom or book a test drive to claim this offer!`);

    return parts.join('\n');
}

function formatAllOffersSummary(offers) {
    const parts = ['**Current BYD Malaysia Promotions**\n'];
    for (const offer of offers) {
        const discount = offer.discount?.amount > 0 ? offer.discount.description : '—';
        const cashback = offer.cashback?.amount > 0 ? offer.cashback.description : '—';
        parts.push(`**${offer.name}:** ${discount} | ${cashback}`);
    }
    parts.push('\n💬 Ask me about a specific model for full details!');
    return parts.join('\n');
}

// POST /api/chat
router.post('/', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ reply: 'Please send a message.' });
    }

    const query = message.trim();
    const offers = readOffers();

    // 1. Check general knowledge first
    const generalReply = matchGeneral(query);
    if (generalReply) {
        return res.json({ reply: generalReply });
    }

    // 2. Try to identify a specific model
    const model = findModel(query);

    if (model) {
        const offer = offers.find(o => o.model === model);
        if (!offer) {
            return res.json({ reply: `I don't have offer details for that model yet. Please check with a BYD showroom for the latest promotions.` });
        }

        if (isOfferQuery(query) || query.includes('offer') || query.includes('promotion')) {
            return res.json({ reply: formatOfferResponse(offer) });
        }

        // General model query — show offer if one exists
        if (offer.discount?.amount > 0 || offer.cashback?.amount > 0) {
            return res.json({
                reply: `Here's what we have for the **${offer.name}**:\n\n${formatOfferResponse(offer)}`
            });
        }

        return res.json({
            reply: `The **${offer.name}** is available now. Check with a BYD showroom for the latest offers, or ask me "what offers for ${offer.name}?" for current promotions.`
        });
    }

    // 3. General offers query — show all
    if (isOfferQuery(query)) {
        return res.json({ reply: formatAllOffersSummary(offers) });
    }

    // 4. Fallback
    return res.json({
        reply: 'I can help you with BYD offers and promotions! Try asking:\n\n• "What offers for BYD Seal?"\n• "Any discount on Atto 3?"\n• "Show me all promotions"\n• "Where is the nearest showroom?"\n\nWhat would you like to know? 😊'
    });
});

module.exports = router;
