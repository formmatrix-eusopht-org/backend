const nodeMailer = require("nodemailer");
const { createUserTemplate } = require("./templates");

const selectTemplate = (first_name, url) => {
    return createUserTemplate(first_name, url);
};

const getSubject = (templateType) => {
    switch (templateType) {
        case "user_account_creation":
            return "Welcome to FormMatic!";
        default:
            return "Notification from FormMatic";
    }
};

async function dynamicSendEmail(email, templateType, first_name, url) {
    try {
        // console.log("sending email to", email);

        let transporter = nodeMailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        let html = await selectTemplate(first_name, url);

        const mailOptions = {
            from: process.env.DEFAULT_FROM,
            to: email,
            subject: getSubject(templateType),
            html,
        };

        await transporter.sendMail(mailOptions);

        return { status: 200, message: "Email sent successfully" };
    } catch (err) {
        console.log("error in dynamicSendingEmail", err);
        return { status: 500, message: err.message || err };
    }
}

module.exports = { dynamicSendEmail };
