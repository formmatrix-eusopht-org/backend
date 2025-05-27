const path = require('path');
const { createInvoice } = require("../utils/createInvoice");
const TransactionPrices = require("../models/transactionPrices"); 
const fs = require('fs');

function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        console.log(`Creating directory: ${directoryPath}`);
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

exports.createInvoice = async (req, res) => {
    try {
        console.log('Received invoice data:', req.body);
        const { userId, email, name, items } = req.body;

        if (!userId || !email || !name || !items || !Array.isArray(items)) {
            return res.status(400).json({
                error: 'Missing required data. Please provide userId, email, name, and items array'
            });
        }

        let pricing = await TransactionPrices.findOne({ user_id: userId });
        if (!pricing) {
            pricing = await TransactionPrices.create({
                user_id: userId,
                simpleTransfer: parseFloat(process.env.SIMPLE_TRANSFER) || 5,
                multipleTransfer: parseFloat(process.env.MULTIPLE_TRANSFER) || 5,
                duplicateTitle: parseFloat(process.env.DUPLICATE_TITLE) || 5,
                duplicateRegistration: parseFloat(process.env.DUPLICATE_REGISTRATION) || 5,
                duplicateStickers: parseFloat(process.env.DUPLICATE_STICKERS) || 5,
                duplicatePlatesAndStickers: parseFloat(process.env.DUPLICATE_PLATES_AND_STICKERS) || 5,
                addLienholder: parseFloat(process.env.ADD_LIENHOLDER) || 5,
                removeLienholder: parseFloat(process.env.REMOVE_LIENHOLDER) || 5,
                nameChange: parseFloat(process.env.NAME_CHANGE) || 5,
                changeOfAddress: parseFloat(process.env.CHANGE_OF_ADDRESS) || 5,
                filingPNO: parseFloat(process.env.FILING_PNO) || 5,
                restorePNOVehicle: parseFloat(process.env.RESTORE_PNO_VEHICLE) || 5,
                certificateOfNonOperation: parseFloat(process.env.CERTIFICATE_OF_NON_OPERATION) || 5,
                personalizedPlates: parseFloat(process.env.PERSONALIZED_PLATES) || 5,
                disabledPersonPlacardsPlates: parseFloat(process.env.DISABLED_PERSON_PLACARDS_PLATES) || 5,
                commercialVehicle: parseFloat(process.env.COMMERCIAL_VEHICLE) || 5,
                salvage: parseFloat(process.env.SALVAGE) || 5,
            });
        }

        const aliasMap = {
            'Simple Transfer': 'simpleTransfer',
            'Multiple Transfer': 'multipleTransfer',
            'Duplicate Title': 'duplicateTitle',
            'Duplicate Registration': 'duplicateRegistration',
            'Duplicate Stickers': 'duplicateStickers',
            'Duplicate Plates And Stickers': 'duplicatePlatesAndStickers',
            'Duplicate Plates & Stickers': 'duplicatePlatesAndStickers',
            'Add Lienholder': 'addLienholder',
            'Remove Lienholder': 'removeLienholder',
            'Name Change': 'nameChange',
            'Change Of Address': 'changeOfAddress',
            'Change of Address': 'changeOfAddress',
            'Filing PNO': 'filingPNO',
            'Filing for Planned Non-Operation (PNO)': 'filingPNO',
            'Restore PNO Vehicle': 'restorePNOVehicle',
            'Restoring PNO Vehicle to Operational': 'restorePNOVehicle',
            'Certificate Of Non Operation': 'certificateOfNonOperation',
            'Personalized Plates': 'personalizedPlates',
            'Disabled Person Placards Plates': 'disabledPersonPlacardsPlates',
            'Disabled Person Placards/Plates': 'disabledPersonPlacardsPlates',
            'Commercial Vehicle': 'commercialVehicle',
            'Salvage': 'salvage'
        };

        console.log('Using pricing for user:', userId, pricing);

        const processedItems = [];
        let subtotal = 0;

        for (const item of items) {
            const transactionType = item.type;

            const normalizedType = aliasMap[transactionType];

            if (!normalizedType) {
                console.log(`Transaction type not found in alias map: ${transactionType}`);
                return res.status(400).json({
                    error: `Transaction type '${transactionType}' not found in alias map. Available types: ${Object.keys(aliasMap).join(', ')}`
                });
            }

            // Directly use the normalized type as the key
            const key = normalizedType;

            const priceInDollars = pricing[key];

            console.log(`Processing item: ${transactionType}, normalized to: ${normalizedType}, price: ${priceInDollars}`);

            if (priceInDollars === undefined) {
                return res.status(400).json({
                    error: `Transaction type '${transactionType}' not found in user's pricing.`
                });
            }

            // Always use quantity of 1, regardless of what's provided
            const quantity = 1;

            // Convert dollars to cents for the invoice utility
            const priceInCents = Math.round(priceInDollars * 100);

            // Add to processed items
            processedItems.push({
                item: item.type,
                quantity: quantity,
                amount: priceInCents * quantity
            });

            // Add to subtotal
            subtotal += priceInCents * quantity;
        }

        const invoiceData = {
            shipping: {
                name: name,
                email: email
            },
            items: processedItems,
            subtotal: subtotal,
            paid: 0, 
            invoice_nr: `INV-${Date.now()}`
        };

   
        const filename = `invoice-${userId}-${Date.now()}.pdf`;
        const invoicePath = path.join(__dirname, '../invoices', filename);
        await createInvoice(invoiceData, invoicePath);

        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/invoices/${filename}`;
        return res.status(200).json({
            message: 'Invoice created successfully.',
            url,
            invoiceData,
            filename
        });
    } catch (error) {
        console.error('Invoice generation error:', error);
        return res.status(500).json({ error: 'Internal server error while creating invoice.' });
    }
}