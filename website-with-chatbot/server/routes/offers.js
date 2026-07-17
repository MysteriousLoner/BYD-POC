const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const OFFERS_FILE = path.join(__dirname, '..', 'data', 'offers.json');

// Read offers from file
function readOffers() {
    try {
        const data = fs.readFileSync(OFFERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading offers:', err.message);
        return [];
    }
}

// Write offers to file
function writeOffers(offers) {
    fs.writeFileSync(OFFERS_FILE, JSON.stringify(offers, null, 2), 'utf-8');
}

// GET all offers
router.get('/', (req, res) => {
    const offers = readOffers();
    res.json(offers);
});

// GET offer by model
router.get('/:model', (req, res) => {
    const offers = readOffers();
    const offer = offers.find(o => o.model === req.params.model);
    if (!offer) {
        return res.status(404).json({ error: 'No offers configured for this model' });
    }
    res.json(offer);
});

// PUT update an offer
router.put('/:model', (req, res) => {
    const offers = readOffers();
    const index = offers.findIndex(o => o.model === req.params.model);

    if (index === -1) {
        return res.status(404).json({ error: 'Model not found' });
    }

    const updated = {
        ...offers[index],
        ...req.body,
        model: req.params.model // prevent model name change
    };

    offers[index] = updated;
    writeOffers(offers);
    res.json(updated);
});

// PATCH update partial
router.patch('/:model', (req, res) => {
    const offers = readOffers();
    const index = offers.findIndex(o => o.model === req.params.model);

    if (index === -1) {
        return res.status(404).json({ error: 'Model not found' });
    }

    // Deep merge discount/cashback if provided
    if (req.body.discount) {
        offers[index].discount = { ...offers[index].discount, ...req.body.discount };
        delete req.body.discount;
    }
    if (req.body.cashback) {
        offers[index].cashback = { ...offers[index].cashback, ...req.body.cashback };
        delete req.body.cashback;
    }

    offers[index] = { ...offers[index], ...req.body };
    writeOffers(offers);
    res.json(offers[index]);
});

module.exports = router;
