import express from 'express';

const app = express();
const port = 4000;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});


app.get('/' , (req , res) => {
  res.send('Hello World!');
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
