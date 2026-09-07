const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    price: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

comboSchema.virtual('finalPrice').get(function finalPrice() {
  return Math.round((this.price - (this.price * this.discountPercentage) / 100) * 100) / 100;
});

comboSchema.set('toJSON', { virtuals: true });
comboSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Combo', comboSchema);
