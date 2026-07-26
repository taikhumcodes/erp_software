import { Route, Switch } from 'wouter';
import { PaymentsList } from './PaymentsList';

export default function PaymentsPage() {
  return (
    <Switch>
      <Route path="/payments" component={PaymentsList} />
      {/* Detail and Form routes can be added here if needed, or we just handle them with dialogs like Sales does */}
    </Switch>
  );
}
