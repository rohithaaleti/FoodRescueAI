const express = require("express");
const request = require("supertest");

jest.mock("../config/db", () => ({
    query: jest.fn()
}));

const listenSpy = jest.spyOn(express.application, "listen");
const app = require("../server");

afterAll(() => {
    listenSpy.mockRestore();
});

test("imports the Express app without starting a server or connecting to MySQL", async () => {
    expect(app).toBeDefined();
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(listenSpy).not.toHaveBeenCalled();
});
