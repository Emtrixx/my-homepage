const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    comment: {
        type: String,
        required: true
    },
    date: Date
})

module.exports = mongoose.model('Comment', CommentSchema);