import { NEWEST_BUNDLED_BULLETIN } from './src/generated/bundled-bulletins.ts';
for (const name of ['Dibrugarh', 'Dhemaji', 'Lakhimpur', 'Hojai', 'Bongaigao n']) {
  const d = NEWEST_BUNDLED_BULLETIN.districts.find((x) => String(x.district) === name);
  console.log(name, '| pop.total', JSON.stringify(d?.population.total), '| villages', JSON.stringify(d?.villagesAffected));
}
