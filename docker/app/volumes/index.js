const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname + '/static'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});