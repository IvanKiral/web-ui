describe('Initial web page loading', () => {
  it('Opens Lumeer and waits to be redirected to the default project', () => {
    cy.visit('/');
    cy.contains('Tables', {timeout: 10000});
    cy.location('pathname').should('have.string', '/view/search/all');
  });
});
