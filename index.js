
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const app = express();
const port = process.env.PORT || 10000;
const upload = multer();

app.use(cors());
app.use(express.json());

app.post('/pdf/analyze', upload.single('file'), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;
    const image = await sharp(imageBuffer).resize(1000).toBuffer();

    const { data: { text } } = await Tesseract.recognize(image, 'eng');

    const zahlen = Array.from(text.matchAll(/\d+(\.\d+)?/g)).map(m => parseFloat(m[0]));
    const mmWerte = zahlen.filter(z => z > 3 && z < 2000);
    mmWerte.sort((a, b) => b - a);
    const [l, b, d] = mmWerte;

    const material = req.body.material || 'aluminium';
    const stueckzahl = parseInt(req.body.stueckzahl) || 1;

    const dichteTabelle = {
      aluminium: 2.7,
      edelstahl: 7.9,
      stahl: 7.85,
      messing: 8.4,
      kupfer: 8.9
    };

    const preisProKg = {
      aluminium: 7,
      edelstahl: 6.5,
      stahl: 1.5,
      messing: 8,
      kupfer: 10
    };

    const dichte = dichteTabelle[material] || 2.7;
    const kgPreis = preisProKg[material] || 7;

    if (!l || !b || !d) {
      return res.json({ manuell: true });
    }

    const volumen = (l / 10) * (b / 10) * (d / 10);
    const gewicht = volumen * dichte / 1000;
    const materialkosten = gewicht * kgPreis;

    const laufzeitMin = 5 + Math.sqrt(l * b) * 0.02 + (d * 0.1);
    const laufzeitKosten = (laufzeitMin / 60) * 35;

    const rüsten = 60;
    const programmieren = 30;

    const grundkosten = materialkosten + laufzeitKosten + (rüsten + programmieren) / stueckzahl;
    const vk = grundkosten * 1.15;

    const preis = parseFloat((vk).toFixed(2));
    return res.json({ preis });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Berechnung fehlgeschlagen' });
  }
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
