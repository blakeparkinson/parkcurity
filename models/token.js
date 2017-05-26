var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TokenSchema = new Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    os: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Token', TokenSchema);
