const Sample = require("../models/Sample");

const fs = require("fs");
const csv = require("csv-parser");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const iconv = require("iconv-lite");

module.exports = class SampleController {
  static index(req, res) {
    res.render("sample/index");
  }

  static async listSamples(req, res) {
    const search = req.query.search;

    let queryOptions = {
      where: {
        ...(search && {
          point: {
            [Op.like]: `%${search}%`,
          },
        }),
      },
      raw: true,
    };

    const samples = await Sample.findAll(queryOptions);

    res.render("sample/list", { samples });
  }

  static async deleteSample(req, res) {
    await Sample.destroy({ where: { id: req.body.id } });

    res.redirect("/sample/list");
  }

  static async editSampleGet(req, res) {
    const sample = await Sample.findOne({
      raw: true,
      where: { id: req.params.id },
    });

    res.render("sample/edit", { sample });
  }

  static async editSamplePost(req, res) {
    const id = req.body.id;

    const sample = await Sample.findOne({ raw: true, where: { id: id } });

    const variableData = {};

    for (const key in req.body) {
      variableData[key] = req.body[key];
    }

    sample.data = {
      ...sample.data,
      ...variableData,
    };

    await Sample.update(sample, { where: { id: id } });

    res.redirect("/sample/list");
  }

  static async importCsvGet(req, res) {
    res.render("sample/import");
  }

  static async importCsvPost(req, res) {
    if (!req.file) {
      return res.redirect("/sample/import");
    }

    const currentImportId = uuidv4();
    const groupedData = {};
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream("latin1"))
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        const key = `${row["Ponto"]}_${row["Data"]}`;

        if (!groupedData[key]) {
          groupedData[key] = {
            importId: currentImportId,
            point: row["Ponto"],
            date: row["Data"],
            opUnit: row["Unidade Operacional"],
            nature: row["Natureza"],
            parameters: {},
          };
        }

        groupedData[key].parameters[row["Parametro"]] = {
          value: row["Valor medido"],
          unit: row["Unidade"],
        };
      })
      .on("end", async () => {
        try {
          for (const key in groupedData) {
            const item = groupedData[key];
            const sampleData = {
              importId: currentImportId,
              point: item["point"],
              date: item["date"],
              data: {
                ...item.parameters,
              },
            };

            await Sample.create(sampleData);
          }
          fs.unlinkSync(filePath);
          req.flash("message", "Dados importados com sucesso!");
          res.redirect("/sample/list");
        } catch (error) {
          console.log(error);
          fs.unlinkSync(filePath);
          res.status(500).send("Erro ao importar!");
        }
      });
  }

  static async deleteImportGet(req, res) {
    const samples = await Sample.findAll();

    let importIdsArray = [];
    for (let sample of samples) {
      if (!importIdsArray.includes(sample.dataValues.importId)) {
        importIdsArray.push(sample.dataValues.importId);
      }
    }

    res.render("sample/deleteImport", { importIdsArray });
  }

  static async deleteImportPost(req, res) {
    const importId = req.body.idSelection;

    await Sample.destroy({ where: { importId: importId } });

    res.redirect("/sample/list");
  }
};
