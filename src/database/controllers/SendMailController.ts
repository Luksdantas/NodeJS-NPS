import { Request, Response } from "express";
import { getCustomRepository } from "typeorm";
import { SurveysRepository } from "../../repositories/SurveysRepository";
import { SurveyUsersRepository } from "../../repositories/SurveysUserRepository";
import { UsersRepository } from "../../repositories/UsersRepository";
import SendMailServices from "../../services/SendMailService";
import { resolve } from "path";
import SendMailService from "../../services/SendMailService";

class SendMailController {
  async execute(request: Request, response: Response) {
    const { email, survey_id } = request.body;

    const usersRepository = getCustomRepository(UsersRepository);
    const surveysRepository = getCustomRepository(SurveysRepository);
    const surveyUsersRepository = getCustomRepository(SurveyUsersRepository);

    const user = await usersRepository.findOne({ email });

    if (!user) {
      return response.status(400).json({
        error: "User does not exists",
      });
    }

    const survey = await surveysRepository.findOne({ id: survey_id });

    if (!survey) {
      return response.status(400).json({
        error: "Survey does not exists",
      });
    }

    const npsPath = resolve(
      __dirname,
      "..",
      "..",
      "views",
      "emails",
      "npsMail.hbs"
    );

    const variables = {
      name: user.name,
      title: survey.title,
      description: survey.description,
      user_id: user.id,
      link: process.env.URL_MAIL,
    };

    const surveyUserAlreadyExists = await surveyUsersRepository.findOne({
      where: [{ user_id: user.id }, { value: null }],
      relations: ["user", "survey"]
    });

    if(surveyUserAlreadyExists) {
        await SendMailService.execute(email, survey.title, variables, npsPath)
        return response.json(surveyUserAlreadyExists)
    }


    // Salvar as informações na tabela surveyUser e depois enviar o email
    const surveyUser = surveyUsersRepository.create({
      user_id: user.id,
      survey_id,
    });


    await surveyUsersRepository.save(surveyUser);

    await SendMailServices.execute(email, survey.title, variables, npsPath);

    return response.json(surveyUser);
  }
}

export { SendMailController };
