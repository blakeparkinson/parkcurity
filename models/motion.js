var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var MotionSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    labels:{
        type: Array,
        required: false
    },
    cameraId: {
        type: Number,
        required: true
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Motion', MotionSchema);
